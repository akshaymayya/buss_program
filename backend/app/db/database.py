import sqlite3
import os
import json
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Any
from contextlib import contextmanager

try:
    from ..core.config import settings
    DB_FILE = settings.DATABASE_PATH
    BUSY_TIMEOUT_MS = settings.SQLITE_BUSY_TIMEOUT_MS
except Exception:
    DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "mefleet.db")
    BUSY_TIMEOUT_MS = 5000

def get_db_connection() -> sqlite3.Connection:
    """
    Returns a SQLite connection configured for high-concurrency enterprise use:
    - Dict-like row access (sqlite3.Row)
    - Foreign keys enforced
    - Write-Ahead Logging (WAL) enabled for concurrent reads while writing
    - Busy timeout set to 5000ms to eliminate 'database is locked' errors
    """
    conn = sqlite3.connect(DB_FILE, check_same_thread=False, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute(f"PRAGMA busy_timeout = {BUSY_TIMEOUT_MS};")
    return conn

@contextmanager
def immediate_transaction(conn: sqlite3.Connection):
    """
    Context manager for SQLite immediate transactions (BEGIN IMMEDIATE).
    Acquires an immediate reserved write lock to prevent TOCTOU race conditions 
    during dispatch, assignment, and status updates.
    """
    cursor = conn.cursor()
    cursor.execute("BEGIN IMMEDIATE;")
    try:
        yield cursor
        conn.commit()
    except Exception:
        conn.rollback()
        raise

def init_db():
    """Initializes database schema and populates seed data if empty."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS buses (
        id TEXT PRIMARY KEY,
        plate_number TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'Available' CHECK(status IN ('Available', 'On Route', 'Maintenance')),
        assigned_route TEXT,
        assigned_date TEXT,
        assigned_driver_id TEXT,
        assigned_helper_ids TEXT,
        last_maintenance_date TEXT,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('Driver', 'Helper')),
        phone TEXT NOT NULL,
        email TEXT,
        licence_number TEXT,
        licence_type TEXT DEFAULT 'Heavy Commercial Vehicle (HCV)',
        licence_expiry TEXT,
        is_licence_verified INTEGER DEFAULT 1,
        current_location TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Available' CHECK(status IN ('Available', 'Assigned', 'En Route', 'On Duty', 'Resting', 'On Leave', 'Unavailable')),
        joined_date TEXT NOT NULL,
        total_duty_hours REAL DEFAULT 0.0,
        max_daily_duty_hours REAL DEFAULT 10.0,
        min_rest_hours REAL DEFAULT 8.0,
        last_trip_completed_at TEXT,
        rest_ends_at TEXT,
        company_id TEXT DEFAULT 'CMP-001',
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trip_assignments (
        id TEXT PRIMARY KEY,
        company_id TEXT DEFAULT 'CMP-001',
        bus_id TEXT NOT NULL,
        route_source TEXT NOT NULL,
        route_destination TEXT NOT NULL,
        travel_date TEXT NOT NULL,
        departure_time TEXT NOT NULL,
        driver_id TEXT NOT NULL,
        helper_ids TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Scheduled' CHECK(status IN ('Scheduled', 'En Route', 'Completed', 'Cancelled')),
        verified_departure_at TEXT,
        verified_arrival_at TEXT,
        verified_by TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(driver_id) REFERENCES employees(id),
        FOREIGN KEY(bus_id) REFERENCES buses(id)
    );

    CREATE TABLE IF NOT EXISTS employee_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT NOT NULL,
        old_location TEXT,
        new_location TEXT NOT NULL,
        reason TEXT NOT NULL,
        trip_id TEXT,
        updated_by TEXT DEFAULT 'System',
        timestamp TEXT NOT NULL,
        FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS employee_trip_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT NOT NULL,
        trip_id TEXT NOT NULL,
        role TEXT NOT NULL,
        route TEXT NOT NULL,
        departure_time TEXT,
        arrival_time TEXT,
        duty_hours REAL DEFAULT 0.0,
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        user_role TEXT DEFAULT 'Management Staff',
        details TEXT NOT NULL,
        company_id TEXT DEFAULT 'CMP-001'
    );
    """)

    now_str = datetime.now().isoformat()

    # Seed buses if empty
    cursor.execute("SELECT COUNT(*) FROM buses")
    if cursor.fetchone()[0] == 0:
        initial_buses = [
            ("B1", "KA-19-AB-1234", "Multi-Axle Volvo", 40, "Available", None, None, None, None, "2025-12-15", now_str),
            ("B2", "KA-01-F-9999", "Non-AC Seater", 50, "Available", None, None, None, None, "2025-11-20", now_str),
            ("B3", "KA-51-Z-5678", "Sleeper AC", 30, "Maintenance", None, None, None, None, "2026-01-10", now_str),
            ("B4", "KA-19-XY-4567", "Semi-Sleeper", 45, "Available", None, None, None, None, "2025-10-05", now_str),
        ]
        cursor.executemany("""
        INSERT INTO buses (
            id, plate_number, type, capacity, status,
            assigned_route, assigned_date, assigned_driver_id,
            assigned_helper_ids, last_maintenance_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, initial_buses)

        cursor.execute("""
        INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, user_role, details, company_id)
        VALUES (?, 'INITIAL_SEED_FLEET', 'SYSTEM', 'SYSTEM', 'Administrator', 'Seeded initial MeFleet vehicle fleet into SQLite', 'CMP-001')
        """, (now_str,))

    # Seed employees if empty
    cursor.execute("SELECT COUNT(*) FROM employees")
    if cursor.fetchone()[0] == 0:
        initial_employees = [
            # Drivers
            ("E1", "Ramesh Kumar", "Driver", "+91 9876543210", "ramesh.k@mefleet.com", "KA04-2018-00912", "Heavy Commercial Vehicle (HCV)", "2028-05-14", 1, "Bangalore", "Available", "2022-03-15", 340.0, 10.0, 8.0, None, None, "CMP-001", now_str),
            ("E2", "Suresh Babu", "Driver", "+91 9876543211", "suresh.b@mefleet.com", "KA05-2019-01445", "Heavy Commercial Vehicle (HCV)", "2027-11-20", 1, "Bangalore", "Available", "2021-06-10", 410.5, 10.0, 8.0, None, None, "CMP-001", now_str),
            ("E3", "Mahesh Shetty", "Driver", "+91 9876543212", "mahesh.s@mefleet.com", "KA19-2020-05882", "Heavy Commercial Vehicle (HCV)", "2029-01-30", 1, "Mangalore", "Available", "2023-01-05", 215.0, 10.0, 8.0, None, None, "CMP-001", now_str),
            ("E9", "Anand Poojary", "Driver", "+91 9876543213", "anand.p@mefleet.com", "KA20-2017-03319", "Heavy Commercial Vehicle (HCV)", "2027-09-12", 1, "Manipal", "Available", "2022-08-11", 280.0, 10.0, 8.0, None, None, "CMP-001", now_str),
            ("E11", "Sunil Naik", "Driver", "+91 9876543214", "sunil.n@mefleet.com", "KA09-2021-08112", "Heavy Commercial Vehicle (HCV)", "2026-12-15", 1, "Mysore", "Available", "2023-03-01", 190.0, 10.0, 8.0, None, None, "CMP-001", now_str),
            
            # Helpers
            ("E4", "Ganesh", "Helper", "+91 9988776655", "ganesh@mefleet.com", None, None, None, 1, "Bangalore", "Available", "2023-02-20", 180.0, 12.0, 8.0, None, None, "CMP-001", now_str),
            ("E5", "Vinesh", "Helper", "+91 9988776644", "vinesh@mefleet.com", None, None, None, 1, "Bangalore", "Available", "2023-04-10", 160.0, 12.0, 8.0, None, None, "CMP-001", now_str),
            ("E6", "Raju", "Helper", "+91 9988776633", "raju@mefleet.com", None, None, None, 1, "Bangalore", "Available", "2022-11-15", 220.0, 12.0, 8.0, None, None, "CMP-001", now_str),
            ("E7", "Satish", "Helper", "+91 9988776622", "satish@mefleet.com", None, None, None, 1, "Mangalore", "Available", "2023-05-01", 140.0, 12.0, 8.0, None, None, "CMP-001", now_str),
            ("E8", "Kumar", "Helper", "+91 9988776611", "kumar@mefleet.com", None, None, None, 1, "Mangalore", "Available", "2023-06-01", 130.0, 12.0, 8.0, None, None, "CMP-001", now_str),
            ("E10", "Praveen Rai", "Helper", "+91 9988776600", "praveen.r@mefleet.com", None, None, None, 1, "Manipal", "Available", "2023-07-15", 110.0, 12.0, 8.0, None, None, "CMP-001", now_str),
        ]

        cursor.executemany("""
        INSERT INTO employees (
            id, name, role, phone, email, licence_number, licence_type, licence_expiry,
            is_licence_verified, current_location, status, joined_date, total_duty_hours,
            max_daily_duty_hours, min_rest_hours, last_trip_completed_at, rest_ends_at,
            company_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, initial_employees)

        # Initial location logs
        for emp in initial_employees:
            cursor.execute("""
            INSERT INTO employee_locations (employee_id, old_location, new_location, reason, trip_id, updated_by, timestamp)
            VALUES (?, NULL, ?, 'Initial Depot Assignment', NULL, 'System Admin', ?)
            """, (emp[0], emp[9], now_str))

        # Initial audit log
        cursor.execute("""
        INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, user_role, details, company_id)
        VALUES (?, 'INITIAL_SEED_EMPLOYEES', 'SYSTEM', 'SYSTEM', 'Administrator', 'Seeded initial MeFleet driver and helper database', 'CMP-001')
        """, (now_str,))

    conn.commit()
    conn.close()

# Auto-initialize database on import
init_db()

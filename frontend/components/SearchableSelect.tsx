"use client";

import React, { useState, useEffect, useRef } from 'react';

interface SearchableSelectProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label: string;
    excludeValue?: string; // Value to hide from the list
}

const SearchableSelect = ({ options, value, onChange, placeholder, label, excludeValue }: SearchableSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Filter options based on search and excludeValue
    const filteredOptions = options.filter(option =>
        option.toLowerCase().includes(search.toLowerCase()) &&
        option !== excludeValue
    );

    useEffect(() => {
        // Click outside to close
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSelect = (option: string) => {
        onChange(option);
        setSearch('');
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>

            <div
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 bg-white cursor-pointer relative flex items-center justify-between text-sm transition"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={value ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                    {value || placeholder || "Select..."}
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1.5 bg-white border border-gray-200 rounded-md shadow-lg shadow-black/5 max-h-60 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-gray-100 bg-gray-50/70 sticky top-0">
                        <input
                            type="text"
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-emerald-600 bg-white text-gray-900 placeholder:text-gray-400"
                            placeholder="Type to search city..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <div className="overflow-y-auto max-h-48 divide-y divide-gray-50">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <div
                                    key={option}
                                    className={`px-3 py-2 cursor-pointer text-xs transition ${
                                        option === value
                                            ? 'bg-emerald-50 text-emerald-900 font-medium'
                                            : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                    onClick={() => handleSelect(option)}
                                >
                                    {option}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-xs text-gray-400 text-center">No locations found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;

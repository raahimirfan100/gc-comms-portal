"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";

export const COUNTRY_CODES = [
  { value: "+92", label: "PK", name: "Pakistan" },
  { value: "+971", label: "AE", name: "United Arab Emirates" },
  { value: "+966", label: "SA", name: "Saudi Arabia" },
  { value: "+91", label: "IN", name: "India" },
  { value: "+44", label: "UK", name: "United Kingdom" },
  { value: "+1", label: "US", name: "United States" },
  { value: "+93", label: "AF", name: "Afghanistan" },
  { value: "+973", label: "BH", name: "Bahrain" },
  { value: "+880", label: "BD", name: "Bangladesh" },
  { value: "+86", label: "CN", name: "China" },
  { value: "+20", label: "EG", name: "Egypt" },
  { value: "+49", label: "DE", name: "Germany" },
  { value: "+62", label: "ID", name: "Indonesia" },
  { value: "+98", label: "IR", name: "Iran" },
  { value: "+964", label: "IQ", name: "Iraq" },
  { value: "+962", label: "JO", name: "Jordan" },
  { value: "+254", label: "KE", name: "Kenya" },
  { value: "+965", label: "KW", name: "Kuwait" },
  { value: "+961", label: "LB", name: "Lebanon" },
  { value: "+60", label: "MY", name: "Malaysia" },
  { value: "+968", label: "OM", name: "Oman" },
  { value: "+974", label: "QA", name: "Qatar" },
  { value: "+27", label: "ZA", name: "South Africa" },
  { value: "+90", label: "TR", name: "Turkey" },
  { value: "+61", label: "AU", name: "Australia" },
  { value: "+33", label: "FR", name: "France" },
  { value: "+39", label: "IT", name: "Italy" },
  { value: "+81", label: "JP", name: "Japan" },
  { value: "+82", label: "KR", name: "South Korea" },
  { value: "+34", label: "ES", name: "Spain" },
];

interface CountryCodePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function CountryCodePicker({ value, onChange, className }: CountryCodePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = COUNTRY_CODES.find((cc) => cc.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[120px] shrink-0 justify-between font-normal", className)}
        >
          {selected ? `${selected.label} ${selected.value}` : value}
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {COUNTRY_CODES.map((cc) => (
                <CommandItem
                  key={cc.value}
                  value={`${cc.name} ${cc.label} ${cc.value}`}
                  onSelect={() => {
                    onChange(cc.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === cc.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {cc.label} {cc.value}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {cc.name}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

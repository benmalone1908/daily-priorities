
import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export type Option = {
  value: string
  label: string
}

interface MultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  maxDisplay?: number
  className?: string
  selectAllOption?: boolean
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items",
  maxDisplay = 3,
  className,
  selectAllOption = true,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (value: string) => {
    if (value === "all") {
      if (selected.length === options.length) {
        onChange([])
      } else {
        onChange(options.map(option => option.value))
      }
      return
    }

    const isSelected = selected.includes(value)
    if (isSelected) {
      onChange(selected.filter(item => item !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const handleClearSelection = (value: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selected.filter(item => item !== value))
  }

  const displaySelection = () => {
    if (selected.length === 0) {
      return <span className="text-muted-foreground">{placeholder}</span>
    }

    if (selected.length === options.length) {
      return <span>All items selected</span>
    }

    return (
      <div className="flex flex-wrap gap-1 max-w-full">
        {selected.slice(0, maxDisplay).map(value => {
          const selectedOption = options.find(option => option.value === value)
          return (
            <Badge 
              key={value}
              variant="secondary"
              className="flex items-center gap-1 pr-1.5"
            >
              {selectedOption?.label}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={(e) => handleClearSelection(value, e)}
              />
            </Badge>
          )
        })}
        {selected.length > maxDisplay && (
          <Badge variant="secondary">+{selected.length - maxDisplay}</Badge>
        )}
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between pl-3", className)}
        >
          <div className="truncate mr-2">{displaySelection()}</div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-full min-w-[200px] max-w-[400px] max-h-[300px] overflow-auto p-0" 
        align="start"
        side="bottom"
        sideOffset={5}
        style={{ zIndex: 50 }}
      >
        <Command>
          <CommandInput placeholder="Search..." className="h-9" />
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup className="max-h-[220px] overflow-auto">
            {selectAllOption && (
              <CommandItem
                key="all"
                value="all"
                onSelect={() => handleSelect("all")}
                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-100"
              >
                <div className="flex items-center justify-center w-5 h-5">
                  <div className={cn(
                    "w-4 h-4 border rounded flex items-center justify-center", 
                    selected.length === options.length ? "bg-primary border-primary" : "border-input"
                  )}>
                    {selected.length === options.length && <Check className="h-3 w-3 text-white" />}
                  </div>
                </div>
                <span>All</span>
              </CommandItem>
            )}
            {options.map(option => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={() => handleSelect(option.value)}
                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-100"
              >
                <div className="flex items-center justify-center w-5 h-5">
                  <div className={cn(
                    "w-4 h-4 border rounded flex items-center justify-center", 
                    selected.includes(option.value) ? "bg-primary border-primary" : "border-input"
                  )}>
                    {selected.includes(option.value) && <Check className="h-3 w-3 text-white" />}
                  </div>
                </div>
                <span>{option.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

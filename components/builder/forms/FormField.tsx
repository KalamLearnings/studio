"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
  htmlFor?: string;
  className?: string;
}

/**
 * Reusable form field wrapper with label, hint, and required indicator
 */
export function FormField({
  label,
  required,
  children,
  hint,
  htmlFor,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor} className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  dir?: "ltr" | "rtl";
  type?: "text" | "number";
  maxLength?: number;
  className?: string;
  id?: string;
}

/**
 * Controlled text input component
 */
export function TextInput({
  value,
  onChange,
  placeholder,
  required,
  dir,
  type = "text",
  maxLength,
  className,
  id,
}: TextInputProps) {
  return (
    <Input
      id={id}
      type={type}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      dir={dir}
      placeholder={placeholder}
      maxLength={maxLength}
      className={cn(dir === "rtl" && "font-arabic text-lg", className)}
    />
  );
}

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  dir?: "ltr" | "rtl";
  rows?: number;
  className?: string;
}

/**
 * Controlled textarea component
 */
export function TextArea({
  value,
  onChange,
  placeholder,
  required,
  dir,
  rows = 3,
  className,
}: TextAreaProps) {
  return (
    <textarea
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      dir={dir}
      placeholder={placeholder}
      rows={rows}
      className={cn(
        "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        dir === "rtl" && "font-arabic text-lg",
        className
      )}
    />
  );
}

interface NumberInputProps {
  value: number | string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Controlled number input component
 */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  required,
  placeholder,
  className,
}: NumberInputProps) {
  return (
    <Input
      type="number"
      required={required}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      className={className}
    />
  );
}

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  className?: string;
}

/**
 * Checkbox with label and optional description
 */
export function Checkbox({
  checked,
  onChange,
  label,
  description,
  className,
}: CheckboxProps) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 cursor-pointer rounded-lg border p-3 transition-colors hover:bg-muted/50",
        checked && "border-primary bg-primary/5",
        className
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
      />
      <div className="flex-1">
        <span className="text-sm font-medium">{label}</span>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </label>
  );
}

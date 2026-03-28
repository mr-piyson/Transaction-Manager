'use client';

import { RefreshCw, QrCode } from 'lucide-react';
import { Field, FieldLabel, FieldError, FieldDescription } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Button } from '@/components/ui/button';
import { useFormContext } from 'react-hook-form';

export const generateItemCode = (prefix = 'ITM') => {
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  return `${prefix}-${randomSuffix}-${timestamp}`;
};

interface CodeGeneratorFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  prefix?: string;
  description?: string;
}

export function CodeGeneratorField({
  name,
  label,
  placeholder,
  prefix,
  description,
}: CodeGeneratorFieldProps) {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext();

  const handleGenerate = () => {
    const newCode = generateItemCode(prefix);
    // { shouldValidate: true } ensures the Zod schema checks the new value immediately
    setValue(name, newCode, { shouldValidate: true });
  };

  return (
    <Field data-invalid={!!errors[name]}>
      <FieldLabel>{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput
          {...register(name)}
          placeholder={placeholder ?? 'Enter or generate code...'}
        />
        <InputGroupAddon className="p-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-none border-l"
            onClick={handleGenerate}
            title="Generate Code"
          >
            <RefreshCw className="size-4 text-muted-foreground" />
          </Button>
        </InputGroupAddon>
        <InputGroupAddon>
          <QrCode className="size-4" />
        </InputGroupAddon>
      </InputGroup>
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{errors[name]?.message as string}</FieldError>
    </Field>
  );
}

import { useWatch, type Control } from 'react-hook-form';

import { DynamicFormField } from '@openzeppelin/ui-renderer';
import type {
  DynamicFormContextProps,
  FieldCondition,
  FormFieldType,
  FormValues,
} from '@openzeppelin/ui-types';

import { AddressFieldWithResolvedPreview } from './AddressFieldWithResolvedPreview';

export interface DynamicFormFieldWithResolvedPreviewProps extends DynamicFormContextProps {
  field: FormFieldType;
  control: Control<FormValues>;
  /** Network id for reverse ENS preview on blockchain-address fields. */
  previewNetworkId?: string;
}

function useShouldRenderField(field: FormFieldType, control: Control<FormValues>): boolean {
  const formValues = useWatch({ control });

  if (field.isHidden) {
    return false;
  }

  if (!field.visibleWhen) {
    return true;
  }

  const conditions: FieldCondition[] = Array.isArray(field.visibleWhen)
    ? field.visibleWhen
    : [field.visibleWhen];

  return conditions.every((condition) => {
    const dependentValue = formValues[condition.field];

    switch (condition.operator) {
      case 'equals':
        return dependentValue === condition.value;
      case 'notEquals':
        return dependentValue !== condition.value;
      case 'contains':
        return String(dependentValue).includes(String(condition.value || ''));
      case 'greaterThan':
        return Number(dependentValue) > Number(condition.value || 0);
      case 'lessThan':
        return Number(dependentValue) < Number(condition.value || 0);
      case 'matches':
        if (typeof condition.value === 'string') {
          const regex = new RegExp(condition.value);
          return regex.test(String(dependentValue || ''));
        }
        return false;
      default:
        return true;
    }
  });
}

/**
 * DynamicFormField that renders blockchain-address inputs with the same ENS
 * preview pattern as role-manager dialogs (AddressFieldWithResolvedPreview).
 */
export function DynamicFormFieldWithResolvedPreview({
  field,
  control,
  addressing,
  typeMapping,
  contractSchema,
  previewNetworkId,
}: DynamicFormFieldWithResolvedPreviewProps): React.ReactElement | null {
  const shouldRender = useShouldRenderField(field, control);
  const previewAddress = useWatch({
    control,
    name: field.name,
    disabled: field.type !== 'blockchain-address',
  }) as string | undefined;

  if (!shouldRender) {
    return null;
  }

  if (field.type === 'blockchain-address') {
    return (
      <AddressFieldWithResolvedPreview
        id={field.id}
        label={field.label}
        placeholder={field.placeholder}
        helperText={field.helperText}
        width={field.width}
        validation={field.validation}
        control={control}
        name={field.name}
        addressing={addressing}
        readOnly={field.readOnly}
        previewAddress={previewAddress}
        previewNetworkId={previewNetworkId}
      />
    );
  }

  return (
    <DynamicFormField
      field={field}
      control={control}
      addressing={addressing}
      typeMapping={typeMapping}
      contractSchema={contractSchema}
    />
  );
}

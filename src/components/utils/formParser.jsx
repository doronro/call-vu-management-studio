// Simple and robust form parser with no advanced methods
export function parseFormSchema(formData) {
  // Initialize empty arrays for steps and fields
  const steps = [];
  const fields = [];
  
  // Basic validation to avoid null errors
  if (!formData) {
    console.log("Form data is null or undefined");
    return { steps, fields };
  }
  
  if (!formData.form) {
    console.log("Form object is missing in form data");
    return { steps, fields };
  }
  
  if (!formData.form.steps) {
    console.log("Steps array is missing in form data");
    return { steps, fields };
  }
  
  // Safely process steps one by one
  for (let i = 0; i < formData.form.steps.length; i++) {
    try {
      const step = formData.form.steps[i];
      if (!step) continue;
      
      steps.push({
        id: step.identifier || `step_${i}`,
        name: step.stepName || `Step ${i+1}`
      });
      
      // Process blocks
      if (!step.blocks) continue;
      
      for (let j = 0; j < step.blocks.length; j++) {
        try {
          const block = step.blocks[j];
          if (!block) continue;
          if (!block.rows) continue;
          
          // Process rows
          for (let k = 0; k < block.rows.length; k++) {
            try {
              const row = block.rows[k];
              if (!row) continue;
              if (!row.fields) continue;
              
              // Process fields
              for (let l = 0; l < row.fields.length; l++) {
                try {
                  const field = row.fields[l];
                  if (!field) continue;
                  if (!field.type) continue;
                  
                  // Skip non-input field types
                  const nonInputTypes = ['separator', 'paragraph', 'imageview', 'displaypdf', 'smartbutton'];
                  if (nonInputTypes.includes(field.type)) continue;
                  
                  // Add field to the list
                  fields.push({
                    id: field.identifier || `field_${i}_${j}_${k}_${l}`,
                    stepId: step.identifier || `step_${i}`,
                    blockId: block.identifier || `block_${i}_${j}`,
                    label: field.label || `Field ${l+1}`,
                    type: field.type,
                    required: !!field.required,
                    items: field.items || [],
                    properties: field
                  });
                } catch (fieldError) {
                  console.error("Error processing field:", fieldError);
                }
              }
            } catch (rowError) {
              console.error("Error processing row:", rowError);
            }
          }
        } catch (blockError) {
          console.error("Error processing block:", blockError);
        }
      }
    } catch (stepError) {
      console.error("Error processing step:", stepError);
    }
  }
  
  console.log("Successfully parsed form with steps:", steps.length, "and fields:", fields.length);
  return { steps, fields };
}

// Get the next field in sequence
export function getNextField(fields, currentFieldId) {
  // Safety checks
  if (!fields) return null;
  if (!Array.isArray(fields)) return null;
  if (fields.length === 0) return null;
  
  // If no current field, return the first field
  if (!currentFieldId) {
    return fields[0] || null;
  }
  
  // Find index of current field
  let currentIndex = -1;
  for (let i = 0; i < fields.length; i++) {
    if (fields[i] && fields[i].id === currentFieldId) {
      currentIndex = i;
      break;
    }
  }
  
  // If current field not found or it's the last field, return null
  if (currentIndex === -1 || currentIndex === fields.length - 1) {
    return null;
  }
  
  // Return the next field
  return fields[currentIndex + 1] || null;
}

// Format field value for display
export function formatFieldValue(field, value) {
  if (!field) return value;
  if (value === undefined || value === null) return "";
  
  try {
    switch (field.type) {
      case 'dateInput':
        if (typeof value === 'string') {
          return new Date(value).toLocaleDateString();
        }
        if (value instanceof Date) {
          return value.toLocaleDateString();
        }
        return value;
        
      case 'dropdownInput':
      case 'radioInput':
        if (field.items && Array.isArray(field.items)) {
          for (let i = 0; i < field.items.length; i++) {
            const item = field.items[i];
            if (item && item.value === value) {
              return item.label || value;
            }
          }
        }
        
        if (field.properties && field.properties.items && Array.isArray(field.properties.items)) {
          for (let i = 0; i < field.properties.items.length; i++) {
            const item = field.properties.items[i];
            if (item && item.value === value) {
              return item.label || value;
            }
          }
        }
        
        return value;
        
      case 'checkboxInput':
        return value ? 'Yes' : 'No';
        
      default:
        return value;
    }
  } catch (error) {
    console.error("Error formatting field value:", error);
    return String(value || "");
  }
}

// Generate summary of form responses
export function generateFormSummary(fields, formData) {
  if (!fields) return {};
  if (!Array.isArray(fields)) return {};
  if (!formData) return {};
  
  const summary = {};
  
  for (let i = 0; i < fields.length; i++) {
    try {
      const field = fields[i];
      if (!field) continue;
      if (!field.id) continue;
      
      const value = formData[field.id];
      if (value === undefined) continue;
      
      const displayLabel = field.label || field.id;
      summary[displayLabel] = formatFieldValue(field, value);
    } catch (error) {
      console.error("Error generating summary for field:", error);
    }
  }
  
  return summary;
}
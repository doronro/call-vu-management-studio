/**
 * CVUF File Parser
 * Specialized parser for Call-VU Universal Form (CVUF) format
 */

/**
 * Parse a CVUF file into a standardized form schema
 * @param {Object} cvufData - The raw CVUF file data
 * @returns {Object} Standardized form schema with steps and fields
 */
export function parseCVUFSchema(cvufData) {
  console.log("Parsing CVUF schema:", cvufData);
  
  // Initialize empty arrays for steps and fields
  const steps = [];
  const fields = [];
  
  try {
    // Basic validation to avoid null errors
    if (!cvufData || !cvufData.form) {
      console.error("Invalid CVUF data: Missing form object");
      return { steps, fields };
    }
    
    const form = cvufData.form;
    
    // Extract form metadata
    const formMetadata = {
      name: form.formName || form.title || "Form",
      description: form.description || "",
      theme: form.theme || {},
      direction: form.direction || "ltr"
    };
    
    // Process steps
    if (Array.isArray(form.steps)) {
      form.steps.forEach((step, stepIndex) => {
        if (!step) return;
        
        // Create step object
        const stepObj = {
          id: step.identifier || `step_${stepIndex}`,
          name: step.stepName || `Step ${stepIndex + 1}`,
          blocks: [],
          fields: []
        };
        
        steps.push(stepObj);
        
        // Process blocks within step
        if (Array.isArray(step.blocks)) {
          step.blocks.forEach((block, blockIndex) => {
            if (!block) return;
            
            // Create block object
            const blockObj = {
              id: block.identifier || `block_${stepIndex}_${blockIndex}`,
              name: block.blockName || `Block ${blockIndex + 1}`,
              style: block.style || {}
            };
            
            stepObj.blocks.push(blockObj);
            
            // Process rows within block
            if (Array.isArray(block.rows)) {
              block.rows.forEach((row, rowIndex) => {
                if (!row || !Array.isArray(row.fields)) return;
                
                // Process fields within row
                row.fields.forEach((field, fieldIndex) => {
                  if (!field || !field.type) return;
                  
                  // Skip non-input field types
                  const nonInputTypes = ['separator', 'paragraph', 'imageview', 'displaypdf'];
                  if (nonInputTypes.includes(field.type)) return;
                  
                  // Create field object
                  const fieldObj = {
                    id: field.identifier || `field_${stepIndex}_${blockIndex}_${rowIndex}_${fieldIndex}`,
                    stepId: stepObj.id,
                    blockId: blockObj.id,
                    label: field.label || "",
                    type: mapFieldType(field.type),
                    required: !!field.required,
                    readOnly: !!field.readOnly,
                    width: field.width || "full",
                    options: extractFieldOptions(field),
                    properties: field
                  };
                  
                  fields.push(fieldObj);
                  stepObj.fields.push(fieldObj.id);
                });
              });
            }
          });
        }
      });
    }
    
    console.log("Successfully parsed CVUF schema with steps:", steps.length, "and fields:", fields.length);
    return { steps, fields, metadata: formMetadata };
  } catch (error) {
    console.error("Error parsing CVUF schema:", error);
    return { steps, fields };
  }
}

/**
 * Map CVUF field types to standardized field types
 * @param {string} cvufType - The CVUF field type
 * @returns {string} Standardized field type
 */
function mapFieldType(cvufType) {
  const typeMap = {
    'textInput': 'text',
    'textinput': 'text',
    'numberInput': 'number',
    'numberinput': 'number',
    'emailInput': 'email',
    'emailinput': 'email',
    'passwordInput': 'password',
    'passwordinput': 'password',
    'phoneInput': 'tel',
    'phoneinput': 'tel',
    'textareaInput': 'textarea',
    'textareainput': 'textarea',
    'textarea': 'textarea',
    'checkboxInput': 'checkbox',
    'checkboxinput': 'checkbox',
    'radioInput': 'radio',
    'radioinput': 'radio',
    'dropdownInput': 'select',
    'dropdowninput': 'select',
    'dateInput': 'date',
    'dateinput': 'date',
    'timeInput': 'time',
    'timeinput': 'time',
    'fileInput': 'file',
    'fileinput': 'file',
    'signaturePad': 'signature',
    'signaturepad': 'signature',
    'ratingInput': 'rating',
    'ratinginput': 'rating',
    'currencyInput': 'currency',
    'currencyinput': 'currency'
  };
  
  return typeMap[cvufType] || cvufType;
}

/**
 * Extract options from CVUF field
 * @param {Object} field - The CVUF field object
 * @returns {Array} Array of options
 */
function extractFieldOptions(field) {
  if (field.items && Array.isArray(field.items)) {
    return field.items.map(item => ({
      label: item.label || item.value,
      value: item.value
    }));
  }
  
  return [];
}

/**
 * Get field value from form data
 * @param {Object} formData - The form data
 * @param {string} fieldId - The field ID
 * @returns {any} Field value
 */
export function getFieldValue(formData, fieldId) {
  if (!formData || !fieldId) return null;
  return formData[fieldId] || null;
}

/**
 * Format field value for display
 * @param {Object} field - The field object
 * @param {any} value - The field value
 * @returns {string} Formatted value
 */
export function formatCVUFFieldValue(field, value) {
  if (!field) return value;
  if (value === undefined || value === null) return "";
  
  try {
    switch (field.type) {
      case 'date':
        if (typeof value === 'string') {
          return new Date(value).toLocaleDateString();
        }
        if (value instanceof Date) {
          return value.toLocaleDateString();
        }
        return value;
        
      case 'select':
      case 'radio':
        if (field.options && Array.isArray(field.options)) {
          const option = field.options.find(opt => opt.value === value);
          return option ? option.label : value;
        }
        return value;
        
      case 'checkbox':
        return value ? 'Yes' : 'No';
        
      case 'currency':
        return typeof value === 'number' ? `$${value.toFixed(2)}` : value;
        
      default:
        return String(value);
    }
  } catch (error) {
    console.error("Error formatting field value:", error);
    return String(value || "");
  }
}

/**
 * Generate summary of form responses
 * @param {Array} fields - Array of field objects
 * @param {Object} formData - The form data
 * @returns {Object} Summary object
 */
export function generateCVUFSummary(fields, formData) {
  if (!fields || !Array.isArray(fields) || !formData) return {};
  
  const summary = {};
  
  fields.forEach(field => {
    if (!field || !field.id) return;
    
    const value = formData[field.id];
    if (value === undefined) return;
    
    const displayLabel = field.label || field.id;
    summary[displayLabel] = formatCVUFFieldValue(field, value);
  });
  
  return summary;
}

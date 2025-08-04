import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { Link, useLocation } from 'react-router-dom';
import { db } from '../firebase/config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';

function CreateRoster() {
  const { user } = useUser();
  const location = useLocation();
  const [sections, setSections] = useState([
    { id: 1, label: 'Option 1', options: '', categoryType: 'none', subLabel: '', isTextArea: false }
  ]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCategoryOptions, setSelectedCategoryOptions] = useState([]);
  const [isCreateOptionsExpanded, setIsCreateOptionsExpanded] = useState(true);
  const [entryFields, setEntryFields] = useState([]);
  const [entryValues, setEntryValues] = useState({});
  const [rosterEntries, setRosterEntries] = useState([]);
  const [rosterName, setRosterName] = useState('');
  const [categoryNames, setCategoryNames] = useState({
    category1: 'Category 1',
    category2: 'Category 2', 
    category3: 'Category 3'
  });
  const [draggedEntryIndex, setDraggedEntryIndex] = useState(null);
  const [rosterId, setRosterId] = useState(null); // Track if editing existing roster

  // Load roster data if editing
  useEffect(() => {
    if (location.state?.editRoster) {
      const roster = location.state.editRoster;
      loadRosterData(roster);
    }
  }, [location.state]);

  if (!user) {
    return <div>Loading...</div>;
  }

  // Function to load roster data for editing
  const loadRosterData = (roster) => {
    try {
      // Load basic information
      setRosterName(roster.name || '');
      setRosterId(roster.rosterId);
      
      // Load option configuration
      if (roster.optionData) {
        setSections(roster.optionData.sections || []);
        setCategoryNames(roster.optionData.categoryNames || {
          category1: 'Category 1',
          category2: 'Category 2', 
          category3: 'Category 3'
        });
        setEntryFields(roster.optionData.entryFields || []);
      }
      
      // Load entries (sort by order to maintain drag-and-drop sequence)
      const entries = roster.entries || [];
      const sortedEntries = entries.sort((a, b) => (a.order || 0) - (b.order || 0));
      setRosterEntries(sortedEntries.map(entry => {
        // Remove metadata fields for display
        const { order, entryId, ...displayEntry } = entry;
        return displayEntry;
      }));
      
      console.log('Roster loaded for editing:', roster);
    } catch (error) {
      console.error('Error loading roster data:', error);
      alert('Error loading roster data. Please try again.');
    }
  };

  const updateLabel = (id, newLabel) => {
    setSections(sections.map(section => 
      section.id === id ? { ...section, label: newLabel } : section
    ));
  };

  const updateOptions = (id, newOptions) => {
    setSections(sections.map(section => 
      section.id === id ? { ...section, options: newOptions } : section
    ));
  };

  const updateCategoryType = (id, categoryType) => {
    setSections(sections.map(section => 
      section.id === id ? { 
        ...section, 
        categoryType: section.categoryType === categoryType ? 'none' : categoryType 
      } : section
    ));
  };

  const updateCategoryName = (categoryKey, newName) => {
    setCategoryNames(prev => ({
      ...prev,
      [categoryKey]: newName
    }));
  };

  const updateSubLabel = (id, subLabel) => {
    // Find the section being updated
    const updatedSection = sections.find(section => section.id === id);
    if (!updatedSection || updatedSection.categoryType === 'none') return;
    
    // Update all sections in the same category with the same sub-label
    setSections(sections.map(section => 
      section.categoryType === updatedSection.categoryType 
        ? { ...section, subLabel } 
        : section
    ));
  };

  const getSubLabelForCategory = (categoryType) => {
    if (categoryType === 'none') return '';
    const sectionWithSubLabel = sections.find(section => 
      section.categoryType === categoryType && section.subLabel.trim() !== ''
    );
    return sectionWithSubLabel ? sectionWithSubLabel.subLabel : '';
  };

  const isSubLabelEditable = (section) => {
    if (section.categoryType === 'none') return false;
    
    // Find the first section in this category that has a sub-label
    const firstSectionWithSubLabel = sections.find(s => 
      s.categoryType === section.categoryType && s.subLabel.trim() !== ''
    );
    
    // If no section has a sub-label yet, or this is the first section with a sub-label, it's editable
    return !firstSectionWithSubLabel || firstSectionWithSubLabel.id === section.id;
  };

  const toggleTextArea = (id) => {
    setSections(sections.map(section => 
      section.id === id ? { ...section, isTextArea: !section.isTextArea } : section
    ));
  };

  const addSection = () => {
    const newId = sections.length + 1;
    setSections([...sections, { id: newId, label: `Option ${newId}`, options: '', categoryType: 'none', subLabel: '', isTextArea: false }]);
  };

  const handleCategorySelect = (categoryLabel) => {
    setSelectedCategory(categoryLabel);
    const selectedSection = sections.find(section => section.label === categoryLabel && section.categoryType !== 'none');
    if (selectedSection) {
      const options = selectedSection.options.split(',').map(opt => opt.trim()).filter(opt => opt !== '');
      setSelectedCategoryOptions(options);
    } else {
      setSelectedCategoryOptions([]);
    }
  };

  const getCategories = () => {
    return sections.filter(section => section.categoryType !== 'none' && section.label.trim() !== '');
  };

  const saveRoster = () => {
    console.log('Saving roster:', sections);
    
    // Build entry fields based on sections
    const fields = [];
    
    // Group Category 1 fields
    const cat1Fields = sections.filter(s => s.categoryType === 'category1').sort((a, b) => a.id - b.id);
    if (cat1Fields.length > 0) {
      const cat1SubLabel = getSubLabelForCategory('category1');
      const cat1Options = cat1Fields.map(field => field.label).filter(label => label.trim() !== '');
      
      if (cat1Options.length > 0) {
        // First dropdown - primary categories (labels)
        fields.push({
          type: 'dropdown',
          label: categoryNames.category1,
          options: cat1Options,
          id: 'category1_primary',
          category: 'category1',
          isCategory: true,
          categoryFields: cat1Fields
        });
        
        // Second dropdown - sub options (will be populated based on selection)
        fields.push({
          type: 'dropdown',
          label: cat1SubLabel || 'Options',
          options: [],
          id: 'category1_secondary',
          category: 'category1',
          dependsOn: 'category1_primary',
          categoryFields: cat1Fields
        });
      }
    }
    
    // Group Category 2 fields
    const cat2Fields = sections.filter(s => s.categoryType === 'category2').sort((a, b) => a.id - b.id);
    if (cat2Fields.length > 0) {
      const cat2SubLabel = getSubLabelForCategory('category2');
      const cat2Options = cat2Fields.map(field => field.label).filter(label => label.trim() !== '');
      
      if (cat2Options.length > 0) {
        // First dropdown - primary categories (labels)
        fields.push({
          type: 'dropdown',
          label: categoryNames.category2,
          options: cat2Options,
          id: 'category2_primary',
          category: 'category2',
          isCategory: true,
          categoryFields: cat2Fields
        });
        
        // Second dropdown - sub options (will be populated based on selection)
        fields.push({
          type: 'dropdown',
          label: cat2SubLabel || 'Options',
          options: [],
          id: 'category2_secondary',
          category: 'category2',
          dependsOn: 'category2_primary',
          categoryFields: cat2Fields
        });
      }
    }
    
    // Group Category 3 fields
    const cat3Fields = sections.filter(s => s.categoryType === 'category3').sort((a, b) => a.id - b.id);
    if (cat3Fields.length > 0) {
      const cat3SubLabel = getSubLabelForCategory('category3');
      const cat3Options = cat3Fields.map(field => field.label).filter(label => label.trim() !== '');
      
      if (cat3Options.length > 0) {
        // First dropdown - primary categories (labels)
        fields.push({
          type: 'dropdown',
          label: categoryNames.category3,
          options: cat3Options,
          id: 'category3_primary',
          category: 'category3',
          isCategory: true,
          categoryFields: cat3Fields
        });
        
        // Second dropdown - sub options (will be populated based on selection)
        fields.push({
          type: 'dropdown',
          label: cat3SubLabel || 'Options',
          options: [],
          id: 'category3_secondary',
          category: 'category3',
          dependsOn: 'category3_primary',
          categoryFields: cat3Fields
        });
      }
    }
    
    // Add non-category fields individually (same as before)
    const noneFields = sections.filter(s => s.categoryType === 'none').sort((a, b) => a.id - b.id);
    noneFields.forEach(field => {
      if (field.isTextArea) {
        fields.push({
          type: 'textarea',
          label: field.subLabel || field.label,
          id: field.id,
          category: 'none'
        });
      } else {
        const options = field.options.split(',').map(opt => opt.trim()).filter(opt => opt !== '');
        if (options.length > 0) {
          fields.push({
            type: 'dropdown',
            label: field.subLabel || field.label,
            options: options,
            id: field.id,
            category: 'none'
          });
        }
      }
    });
    
    setEntryFields(fields);
    console.log('Entry fields created:', fields);
  };

  const updateEntryValue = (fieldId, value) => {
    setEntryValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
    
    // Handle dependent dropdowns for categories
    const field = entryFields.find(f => f.id === fieldId);
    if (field && field.isCategory) {
      // This is a primary category selection, update the secondary dropdown options
      const secondaryFieldId = fieldId.replace('_primary', '_secondary');
      const secondaryField = entryFields.find(f => f.id === secondaryFieldId);
      
      if (secondaryField) {
        if (value) {
          // Find the selected section and get its options
          const selectedSection = field.categoryFields.find(section => section.label === value);
          if (selectedSection) {
            const options = selectedSection.options.split(',').map(opt => opt.trim()).filter(opt => opt !== '');
            
            // Update the secondary field options
            setEntryFields(prevFields => 
              prevFields.map(f => 
                f.id === secondaryFieldId 
                  ? { ...f, options: options }
                  : f
              )
            );
          }
        } else {
          // Clear secondary dropdown options when no primary selection
          setEntryFields(prevFields => 
            prevFields.map(f => 
              f.id === secondaryFieldId 
                ? { ...f, options: [] }
                : f
            )
          );
        }
        
        // Clear the secondary dropdown value
        setEntryValues(prevValues => ({
          ...prevValues,
          [secondaryFieldId]: ''
        }));
      }
    }
  };

  const createEntry = () => {
    // Create a new entry from current values
    const newEntry = {};
    entryFields.forEach(field => {
      newEntry[field.label] = entryValues[field.id] || '';
    });
    
    setRosterEntries(prev => [...prev, newEntry]);
    
    // Clear entry values for next entry
    setEntryValues({});
    
    console.log('Entry created:', newEntry);
  };

  const deleteEntry = (index) => {
    setRosterEntries(prev => prev.filter((_, i) => i !== index));
  };

  const editEntry = (index) => {
    const entryToEdit = rosterEntries[index];
    
    // Clear current values and populate with entry data
    const newValues = {};
    entryFields.forEach(field => {
      newValues[field.id] = entryToEdit[field.label] || '';
    });
    setEntryValues(newValues);
    
    // Remove the entry being edited
    deleteEntry(index);
  };

  const handleDragStart = (e, index) => {
    setDraggedEntryIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedEntryIndex === null) return;
    
    const newEntries = [...rosterEntries];
    const draggedEntry = newEntries[draggedEntryIndex];
    
    // Remove dragged entry
    newEntries.splice(draggedEntryIndex, 1);
    
    // Insert at new position
    newEntries.splice(dropIndex, 0, draggedEntry);
    
    setRosterEntries(newEntries);
    setDraggedEntryIndex(null);
  };

  // Generate unique roster ID
  const generateRosterId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `roster_${timestamp}_${random}`;
  };

  // Load existing roster for editing
  const loadRosterForEditing = async (existingRosterId) => {
    try {
      const rosterDoc = await getDoc(doc(db, 'rosters', existingRosterId));
      
      if (rosterDoc.exists()) {
        const rosterData = rosterDoc.data();
        
        // Load basic information
        setRosterName(rosterData.name || '');
        setRosterId(rosterData.rosterId);
        
        // Load option configuration
        if (rosterData.optionData) {
          setSections(rosterData.optionData.sections || []);
          setCategoryNames(rosterData.optionData.categoryNames || {
            category1: 'Category 1',
            category2: 'Category 2', 
            category3: 'Category 3'
          });
          setEntryFields(rosterData.optionData.entryFields || []);
        }
        
        // Load entries (sort by order to maintain drag-and-drop sequence)
        const entries = rosterData.entries || [];
        const sortedEntries = entries.sort((a, b) => (a.order || 0) - (b.order || 0));
        setRosterEntries(sortedEntries.map(entry => {
          // Remove metadata fields for display
          const { order, entryId, ...displayEntry } = entry;
          return displayEntry;
        }));
        
        console.log('Roster loaded for editing:', rosterData);
        return true;
      } else {
        console.error('Roster not found:', existingRosterId);
        return false;
      }
    } catch (error) {
      console.error('Error loading roster:', error);
      alert(`Error loading roster: ${error.message}`);
      return false;
    }
  };

  const saveRosterToDatabase = async () => {
    try {
      if (!rosterName.trim()) {
        alert('Please enter a roster name');
        return;
      }
      
      if (rosterEntries.length === 0) {
        alert('Please add at least one entry to the roster');
        return;
      }

      // Generate or use existing roster ID
      const currentRosterId = rosterId || generateRosterId();
      
      // Prepare comprehensive roster data (filter out undefined values)
      const rosterData = {
        // Basic Information
        rosterId: currentRosterId,
        name: rosterName.trim(),
        
        // User Information
        MID: user.MID || '',
        author: user.username || user.MID || 'Unknown',
        createdBy: user.username || user.MID || 'Unknown',
        createdByUserId: user.id || user.uid || user.MID || 'unknown',
        
        // Timestamps
        dateModified: serverTimestamp(),
        
        // Option Configuration Data
        optionData: {
          sections: sections,
          categoryNames: categoryNames,
          entryFields: entryFields
        },
        
        // Roster Content
        entries: rosterEntries.map((entry, index) => ({
          ...entry,
          order: index, // Preserve drag-and-drop order
          entryId: `entry_${Date.now()}_${index}` // Unique ID for each entry
        })),
        
        // Metadata
        entryCount: rosterEntries.length,
        version: rosterId ? 'updated' : 'created',
        lastEditedBy: user.username || user.MID || 'Unknown',
        
        // Additional tracking
        isActive: true,
        tags: [], // For future categorization
        description: '' // For future use
      };

      // Only add dateCreated for new rosters
      if (!rosterId) {
        rosterData.dateCreated = serverTimestamp();
      }

      // Check if roster already exists (only if we have an existing rosterId)
      let isUpdate = false;
      if (rosterId) {
        const existingDoc = await getDoc(doc(db, 'rosters', currentRosterId));
        isUpdate = existingDoc.exists();
      }

      // Save to Firestore
      await setDoc(doc(db, 'rosters', currentRosterId), rosterData, { merge: true });
      
      // Update local state to track this roster ID for future saves
      setRosterId(currentRosterId);
      
      // Success message
      alert('Save Successful!');
      
      console.log('Roster saved to database:', {
        rosterId: currentRosterId,
        data: rosterData
      });
      
    } catch (error) {
      console.error('Error saving roster:', error);
      alert(`Error saving roster: ${error.message}. Please try again.`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Back Link */}
      <div style={{ marginBottom: '20px' }}>
        <Link to={`/${user.MID}/admin`} style={{ color: '#3498db', textDecoration: 'none' }}>
          ← Back to Admin Dashboard
        </Link>
      </div>

      {/* Page Title */}
      <h2>{rosterId ? 'Edit Roster' : 'Create New Roster'}</h2>
      
      {rosterId && (
        <div style={{
          padding: '10px 15px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '6px',
          marginBottom: '20px',
          fontSize: '14px',
          color: '#856404'
        }}>
          <strong>Editing Mode:</strong> You are editing an existing roster (ID: {rosterId})
        </div>
      )}

      {/* Create Options Section */}
      <div style={{ 
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <div 
          onClick={() => setIsCreateOptionsExpanded(!isCreateOptionsExpanded)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer',
            marginBottom: isCreateOptionsExpanded ? '15px' : '0'
          }}
        >
          <h3 style={{ margin: 0, marginRight: '10px' }}>Create Options</h3>
          <span style={{ fontSize: '18px', color: '#666' }}>
            {isCreateOptionsExpanded ? '▼' : '▶'}
          </span>
        </div>
        
        {isCreateOptionsExpanded && (
          <>
            {/* Category Name Customization */}
            <div style={{
              marginBottom: '25px',
              padding: '20px',
              backgroundColor: '#e8f5e8',
              borderRadius: '8px',
              border: '1px solid #c3e6c3'
            }}>
              <h4 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 'bold' }}>Customize Category Names</h4>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '14px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Category 1:</label>
                  <input
                    type="text"
                    value={categoryNames.category1}
                    onChange={(e) => updateCategoryName('category1', e.target.value)}
                    placeholder="Enter Category 1 name"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '14px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Category 2:</label>
                  <input
                    type="text"
                    value={categoryNames.category2}
                    onChange={(e) => updateCategoryName('category2', e.target.value)}
                    placeholder="Enter Category 2 name"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '14px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Category 3:</label>
                  <input
                    type="text"
                    value={categoryNames.category3}
                    onChange={(e) => updateCategoryName('category3', e.target.value)}
                    placeholder="Enter Category 3 name"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>

            {sections.map(section => (
          <div key={section.id} style={{ 
            marginBottom: '20px',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            {/* Category Selection */}
            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
                  <input
                    type="radio"
                    name={`category-${section.id}`}
                    checked={section.categoryType === 'category1'}
                    onClick={() => updateCategoryType(section.id, 'category1')}
                    readOnly
                  />
                  {categoryNames.category1}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
                  <input
                    type="radio"
                    name={`category-${section.id}`}
                    checked={section.categoryType === 'category2'}
                    onClick={() => updateCategoryType(section.id, 'category2')}
                    readOnly
                  />
                  {categoryNames.category2}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
                  <input
                    type="radio"
                    name={`category-${section.id}`}
                    checked={section.categoryType === 'category3'}
                    onClick={() => updateCategoryType(section.id, 'category3')}
                    readOnly
                  />
                  {categoryNames.category3}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={section.isTextArea}
                    onChange={() => toggleTextArea(section.id)}
                  />
                  Text Area
                </label>
              </div>
            </div>
            
            {/* Label and Sub-Label Side by Side */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '14px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Label:</label>
                <input
                  type="text"
                  value={section.label}
                  onChange={(e) => updateLabel(section.id, e.target.value)}
                  placeholder="Enter label name"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '14px', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Sub-Label:</label>
                <input
                  type="text"
                  value={getSubLabelForCategory(section.categoryType)}
                  onChange={(e) => updateSubLabel(section.id, e.target.value)}
                  placeholder="Label for dropdown menu"
                  disabled={section.categoryType === 'none' || !isSubLabelEditable(section)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px',
                    backgroundColor: (section.categoryType === 'none' || !isSubLabelEditable(section)) ? '#f5f5f5' : 'white',
                    color: (section.categoryType === 'none' || !isSubLabelEditable(section)) ? '#999' : 'black',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
            
            {/* Options Textarea */}
            <textarea
              value={section.options}
              onChange={(e) => updateOptions(section.id, e.target.value)}
              placeholder="Enter options separated by commas"
              disabled={section.isTextArea}
              style={{
                width: '100%',
                height: '80px',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
                resize: 'vertical',
                backgroundColor: section.isTextArea ? '#f5f5f5' : 'white',
                color: section.isTextArea ? '#999' : 'black'
              }}
            />
            
            {/* Help Text */}
            <p style={{ 
              fontSize: '12px', 
              color: section.isTextArea ? '#999' : '#666', 
              margin: '5px 0 0 0' 
            }}>
              {section.isTextArea ? 'Options disabled when Text Area is selected' : 'Separate options with a comma'}
            </p>
          </div>
        ))}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={addSection}
            style={{
              background: '#28a745',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            + Add Section
          </button>
          
          <button
            onClick={saveRoster}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Save Options
            </button>
          </div>
          </>
        )}
      </div>

      {/* Create Entry Section */}
      <div style={{ marginTop: '30px' }}>
        <h3>Create Entry</h3>
        <div style={{
          padding: '20px',
          backgroundColor: '#e8f4fd',
          borderRadius: '8px',
          border: '1px solid #bee5eb'
        }}>
          {entryFields.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {entryFields.map((field, index) => (
                <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold' }}>
                    {field.label}:
                  </label>
                  {field.type === 'dropdown' ? (
                    <select
                      value={entryValues[field.id] || ''}
                      onChange={(e) => updateEntryValue(field.id, e.target.value)}
                      style={{
                        padding: '8px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Select {field.label}...</option>
                      {field.options.map((option, optIndex) => (
                        <option key={optIndex} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <textarea
                      value={entryValues[field.id] || ''}
                      onChange={(e) => updateEntryValue(field.id, e.target.value)}
                      placeholder={`Enter ${field.label}...`}
                      style={{
                        padding: '8px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px',
                        height: '60px',
                        resize: 'none'
                      }}
                    />
                  )}
                </div>
              ))}
              <button
                onClick={createEntry}
                style={{
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}
              >
                Create Entry
              </button>
            </div>
          ) : (
            <p style={{ 
              color: '#666', 
              fontStyle: 'italic',
              margin: 0
            }}>
              Click "Save Options" above to generate the entry form fields.
            </p>
          )}
        </div>
      </div>

      {/* Roster Section */}
      <div style={{ marginTop: '30px' }}>
        <h3>Roster</h3>
        <div style={{
          padding: '20px',
          backgroundColor: '#f8fff8',
          borderRadius: '8px',
          border: '1px solid #d4edda'
        }}>
          {/* Roster Name Input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
              Name:
            </label>
            <input
              type="text"
              value={rosterName}
              onChange={(e) => setRosterName(e.target.value)}
              placeholder="Enter roster name..."
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Roster Entries */}
          {rosterEntries.length > 0 ? (
            <div style={{ marginBottom: '20px', overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                backgroundColor: 'white',
                borderRadius: '6px',
                overflow: 'hidden',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ 
                      padding: '12px 8px', 
                      textAlign: 'left', 
                      fontWeight: 'bold',
                      fontSize: '14px',
                      borderBottom: '2px solid #dee2e6',
                      width: '30px'
                    }}>
                      #
                    </th>
                    {entryFields.map(field => (
                      <th key={field.id} style={{ 
                        padding: '12px 8px', 
                        textAlign: 'left', 
                        fontWeight: 'bold',
                        fontSize: '14px',
                        borderBottom: '2px solid #dee2e6',
                        minWidth: field.type === 'textarea' ? '200px' : '100px'
                      }}>
                        {field.label}
                      </th>
                    ))}
                    <th style={{ 
                      padding: '12px 8px', 
                      textAlign: 'center', 
                      fontWeight: 'bold',
                      fontSize: '14px',
                      borderBottom: '2px solid #dee2e6',
                      width: '120px'
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rosterEntries.map((entry, index) => (
                    <tr 
                      key={index}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      style={{ 
                        borderBottom: '1px solid #dee2e6',
                        cursor: 'move',
                        backgroundColor: draggedEntryIndex === index ? '#f0f8ff' : 'white'
                      }}
                      onMouseEnter={(e) => e.target.closest('tr').style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => {
                        if (draggedEntryIndex !== index) {
                          e.target.closest('tr').style.backgroundColor = 'white';
                        }
                      }}
                    >
                      <td style={{ 
                        padding: '8px', 
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: '#666'
                      }}>
                        {index + 1}
                      </td>
                      {entryFields.map(field => (
                        <td key={field.id} style={{ 
                          padding: '8px', 
                          fontSize: '13px',
                          borderLeft: '1px solid #f1f3f4',
                          maxWidth: field.type === 'textarea' ? '300px' : '150px'
                        }}>
                          <div style={{
                            overflow: 'hidden',
                            textOverflow: field.type === 'textarea' ? 'initial' : 'ellipsis',
                            whiteSpace: field.type === 'textarea' ? 'pre-wrap' : 'nowrap',
                            wordWrap: field.type === 'textarea' ? 'break-word' : 'normal',
                            maxHeight: field.type === 'textarea' ? '100px' : 'auto',
                            overflowY: field.type === 'textarea' ? 'auto' : 'visible'
                          }}>
                            {entry[field.label] || <em style={{ color: '#999' }}>-</em>}
                          </div>
                        </td>
                      ))}
                      <td style={{ 
                        padding: '8px', 
                        textAlign: 'center',
                        borderLeft: '1px solid #f1f3f4'
                      }}>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <button
                            onClick={() => editEntry(index)}
                            style={{
                              background: '#007bff',
                              color: 'white',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteEntry(index)}
                            style={{
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              color: '#666', 
              fontStyle: 'italic',
              marginBottom: '20px',
              padding: '20px'
            }}>
              No entries added yet. Create entries above to see them here.
            </div>
          )}

          {/* Save Roster Button */}
          <button
            onClick={saveRosterToDatabase}
            disabled={!rosterName.trim() || rosterEntries.length === 0}
            style={{
              background: rosterName.trim() && rosterEntries.length > 0 ? '#dc3545' : '#6c757d',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: rosterName.trim() && rosterEntries.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: '16px',
              fontWeight: 'bold',
              width: '100%'
            }}
          >
            {rosterId ? 'Update Roster in Database' : 'Save Roster to Database'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateRoster;

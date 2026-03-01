# Document System Consolidation

## Problem Identified

The system had **two separate document upload mechanisms** that created confusion and duplication:

### 1. AssessmentDocumentUpload Component (REMOVED)
- **Location**: General document upload section at assessment level
- **Categories**: 9 broad categories (AML Policies, Risk Assessments, Audit Reports, etc.)
- **Use Case**: Organization-wide supporting materials
- **Issue**: Generic categorization caused confusion about what to upload where

### 2. Question-Level Attachments (RETAINED)
- **Location**: Embedded within specific questionnaire questions
- **Categories**: Linked to specific compliance questions
- **Use Case**: Question-specific evidence and proof
- **Advantage**: Direct relationship between evidence and compliance requirement

## Root Cause of Duplication

Both systems used the same database table (`assessment_attachments`) but with different approaches:
- AssessmentDocumentUpload: Used `question_code` field to store document categories
- Question-level attachments: Used `question_code` field to store actual question codes

This created ambiguity in the data model and user experience.

## Solution Implemented

### Changes Made

1. **Removed AssessmentDocumentUpload Component**
   - Deleted: `src/components/AssessmentDocumentUpload.jsx`
   - Removed import and usage from `AssessmentForm.jsx`

2. **Cleaned Up DocumentService**
   - Removed: `uploadAssessmentDocument()` method (86 lines)
   - Removed: `getAssessmentDocuments()` method (54 lines)
   - These methods were only used by the removed component

3. **Retained Question-Level System**
   - Kept all question-level attachment functionality in `AssessmentForm.jsx`
   - Preserved `handleFileUpload()` and `handleFileDelete()` functions
   - Maintained `assessment_attachments` table with proper question code linkage

## Benefits of Consolidation

### 1. **Clearer User Experience**
- Single upload location per requirement
- No confusion about where to upload documents
- Direct connection between questions and supporting evidence

### 2. **Better Compliance Tracking**
- Each document is tied to a specific compliance question
- Easier to audit which requirements have supporting evidence
- Clear tier-based requirements (mandatory/recommended/optional)

### 3. **Cleaner Codebase**
- Removed 140+ lines of unused code
- Eliminated duplicate functionality
- Simplified data model

### 4. **Improved Data Integrity**
- `question_code` field now only contains actual question codes
- No mixing of document categories and question codes
- Better database normalization

## Database Structure (Unchanged)

The `assessment_attachments` table remains the same:

```sql
CREATE TABLE assessment_attachments (
  id uuid PRIMARY KEY,
  assessment_id uuid REFERENCES assessments(id),
  question_code text,  -- Now exclusively for question codes
  file_name text,
  file_path text,
  file_size bigint,
  file_type text,
  uploaded_by uuid REFERENCES auth.users(id),
  metadata jsonb,
  created_at timestamptz
);
```

## User Workflow After Consolidation

1. User navigates through questionnaire sections
2. When a question requires attachments, the upload area appears inline
3. User uploads documents directly to the relevant question
4. Documents are stored with clear linkage to specific compliance requirements
5. Tier-based indicators show if attachments are mandatory, recommended, or optional

## Testing Verification

- Build successful: No compilation errors
- No broken imports or references
- Question-level attachment system fully functional
- Database queries unchanged and working

## Migration Notes

**No database migration required** - this is a frontend-only change. Existing data in `assessment_attachments` remains intact and accessible through the question-level attachment system.

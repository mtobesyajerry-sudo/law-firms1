import React, { useState } from 'react';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

const ClientDeclarationForm = ({ clientType = 'individual', onClose }) => {
  const [formData, setFormData] = useState({
    clientName: '',
    clientType: clientType,
    organizationName: '',
    signatoryName: '',
    signatoryTitle: '',
    date: new Date().toISOString().split('T')[0],
    notarized: false
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateDeclarationDocument = async () => {
    const isLegalEntity = formData.clientType === 'legal_entity';

    // Build children array dynamically to avoid empty paragraphs
    const children = [];

    // Title
    children.push(
      new Paragraph({
        text: 'CLIENT DECLARATION FORM',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // Subtitle
    children.push(
      new Paragraph({
        text: 'AML/CFT COMPLIANCE DECLARATION',
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 }
      })
    );

    // Client Type
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Client Type: ',
            bold: true
          }),
          new TextRun(isLegalEntity ? 'Legal Entity (Company/Organization)' : 'Individual')
        ],
        spacing: { after: 200 }
      })
    );

    // Conditional fields based on client type
    if (isLegalEntity) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Organization Name: ',
              bold: true
            }),
            new TextRun(formData.organizationName || '_________________________________')
          ],
          spacing: { after: 200 }
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Authorized Signatory Name: ',
              bold: true
            }),
            new TextRun(formData.signatoryName || '_________________________________')
          ],
          spacing: { after: 200 }
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Title/Position: ',
              bold: true
            }),
            new TextRun(formData.signatoryTitle || '_________________________________')
          ],
          spacing: { after: 400 }
        })
      );
    } else {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Full Name: ',
              bold: true
            }),
            new TextRun(formData.clientName || '_________________________________')
          ],
          spacing: { after: 400 }
        })
      );
    }

    // Date
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Date: ',
            bold: true
          }),
          new TextRun(formData.date)
        ],
        spacing: { after: 600 }
      })
    );

    // Declaration section
    children.push(
      new Paragraph({
        text: 'DECLARATION',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 300 }
      })
    );

    children.push(
      new Paragraph({
        text: isLegalEntity
          ? 'I, the undersigned authorized representative of the above-named organization, hereby declare and confirm the following:'
          : 'I, the undersigned, hereby declare and confirm the following:',
        spacing: { after: 300 }
      })
    );

    // Declaration items
    children.push(
      new Paragraph({
        text: '1. Accuracy of Information',
        spacing: { after: 200 },
        style: 'ListParagraph'
      })
    );

    children.push(
      new Paragraph({
        text: 'All information, documents, and declarations provided to the institution for the purpose of establishing and maintaining a business relationship are true, accurate, complete, and up-to-date to the best of my knowledge and belief.',
        spacing: { before: 100, after: 300, left: 720 }
      })
    );

    children.push(
      new Paragraph({
        text: '2. Source of Funds and Wealth',
        spacing: { after: 200 },
        style: 'ListParagraph'
      })
    );

    children.push(
      new Paragraph({
        text: isLegalEntity
          ? 'I have provided complete and accurate information regarding the source of the organization\'s capital, funds, and wealth, including the economic activities generating such funds.'
          : 'I have provided complete and accurate information regarding the source of my funds and wealth, including my occupation, income sources, and economic activities.',
        spacing: { before: 100, after: 300, left: 720 }
      })
    );

    children.push(
      new Paragraph({
        text: '3. Beneficial Ownership',
        spacing: { after: 200 },
        style: 'ListParagraph'
      })
    );

    children.push(
      new Paragraph({
        text: isLegalEntity
          ? 'I have disclosed all beneficial owners (individuals who directly or indirectly own or control 10% or more of the organization) and confirm that the beneficial ownership information provided is accurate and complete.'
          : 'I confirm that I am the beneficial owner of the funds and accounts, or I have provided complete information about the beneficial owner(s) if acting on behalf of another party.',
        spacing: { before: 100, after: 300, left: 720 }
      })
    );

    children.push(
      new Paragraph({
        text: '4. Politically Exposed Persons (PEPs)',
        spacing: { after: 200 },
        style: 'ListParagraph'
      })
    );

    children.push(
      new Paragraph({
        text: isLegalEntity
          ? 'I have disclosed whether any beneficial owners, directors, or authorized signatories are or have been entrusted with prominent public functions (PEPs), or are family members or close associates of PEPs.'
          : 'I have accurately disclosed my PEP status, including whether I am or have been entrusted with prominent public functions, or am a family member or close associate of a PEP.',
        spacing: { before: 100, after: 300, left: 720 }
      })
    );

    children.push(
      new Paragraph({
        text: '5. Update Obligation',
        spacing: { after: 200 },
        style: 'ListParagraph'
      })
    );

    children.push(
      new Paragraph({
        text: 'I undertake to promptly notify the institution of any material changes to the information provided, including changes in ownership structure, control, source of funds, or PEP status.',
        spacing: { before: 100, after: 300, left: 720 }
      })
    );

    children.push(
      new Paragraph({
        text: '6. Legal Consequences',
        spacing: { after: 200 },
        style: 'ListParagraph'
      })
    );

    children.push(
      new Paragraph({
        text: 'I understand that:',
        spacing: { before: 100, after: 200, left: 720 }
      })
    );

    children.push(
      new Paragraph({
        text: '• This information is required for AML/CFT compliance purposes under applicable laws and regulations',
        spacing: { before: 100, after: 100, left: 1080 }
      })
    );

    children.push(
      new Paragraph({
        text: '• Providing false, misleading, or incomplete information may result in:',
        spacing: { before: 100, after: 100, left: 1080 }
      })
    );

    children.push(
      new Paragraph({
        text: '  - Refusal to establish or continuation of the business relationship',
        spacing: { before: 50, after: 100, left: 1440 }
      })
    );

    children.push(
      new Paragraph({
        text: '  - Termination of existing business relationship',
        spacing: { before: 50, after: 100, left: 1440 }
      })
    );

    children.push(
      new Paragraph({
        text: '  - Reporting to relevant authorities',
        spacing: { before: 50, after: 100, left: 1440 }
      })
    );

    children.push(
      new Paragraph({
        text: '  - Criminal prosecution under applicable laws',
        spacing: { before: 50, after: 400, left: 1440 }
      })
    );

    children.push(
      new Paragraph({
        text: '7. Consent to Verification',
        spacing: { after: 200 },
        style: 'ListParagraph'
      })
    );

    children.push(
      new Paragraph({
        text: 'I consent to the institution conducting necessary verification checks, including but not limited to identity verification, background checks, and ongoing monitoring of transactions and activities.',
        spacing: { before: 100, after: 600, left: 720 }
      })
    );

    // Signature section
    children.push(
      new Paragraph({
        text: 'SIGNATURE',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 600, after: 400 }
      })
    );

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({
                    text: isLegalEntity ? 'Authorized Signatory Name:' : 'Client Name:',
                    bold: true
                  })]
                })],
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                },
                width: { size: 40, type: WidthType.PERCENTAGE }
              }),
              new TableCell({
                children: [new Paragraph('_________________________________')],
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                },
                width: { size: 60, type: WidthType.PERCENTAGE }
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph(' ')],
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                }
              }),
              new TableCell({
                children: [new Paragraph(' ')],
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                }
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ text: 'Signature:', bold: true })]
                })],
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                }
              }),
              new TableCell({
                children: [new Paragraph('_________________________________')],
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                }
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph(' ')],
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                }
              }),
              new TableCell({
                children: [new Paragraph(' ')],
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                }
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ text: 'Date:', bold: true })]
                })],
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                }
              }),
              new TableCell({
                children: [new Paragraph('_________________________________')],
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                }
              })
            ]
          })
        ]
      })
    );

    // Notary section (if needed)
    if (formData.notarized) {
      children.push(
        new Paragraph({
          text: 'NOTARY PUBLIC CERTIFICATION',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 800, after: 400 }
        })
      );

      children.push(
        new Paragraph({
          text: 'This declaration was signed before me on the date indicated above.',
          spacing: { after: 400 }
        })
      );

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({ text: 'Notary Public Name:', bold: true })]
                  })],
                  borders: {
                    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                  },
                  width: { size: 40, type: WidthType.PERCENTAGE }
                }),
                new TableCell({
                  children: [new Paragraph('_________________________________')],
                  borders: {
                    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                  },
                  width: { size: 60, type: WidthType.PERCENTAGE }
                })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph(' ')],
                  borders: {
                    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                  }
                }),
                new TableCell({
                  children: [new Paragraph(' ')],
                  borders: {
                    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                  }
                })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({ text: 'Signature & Seal:', bold: true })]
                  })],
                  borders: {
                    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                  }
                }),
                new TableCell({
                  children: [new Paragraph('_________________________________')],
                  borders: {
                    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                  }
                })
              ]
            })
          ]
        })
      );
    }

    // Official use section
    children.push(
      new Paragraph({
        text: 'For Official Use Only',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 800, after: 300 }
      })
    );

    children.push(
      new Paragraph({
        text: 'Declaration received and verified by:',
        spacing: { after: 200 }
      })
    );

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ text: 'Officer Name:', bold: true })]
                })],
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                },
                width: { size: 40, type: WidthType.PERCENTAGE }
              }),
              new TableCell({
                children: [new Paragraph('_________________________________')],
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                },
                width: { size: 60, type: WidthType.PERCENTAGE }
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ text: 'Signature:', bold: true })]
                })],
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                }
              }),
              new TableCell({
                children: [new Paragraph('_________________________________')],
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                }
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ text: 'Date:', bold: true })]
                })],
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                }
              }),
              new TableCell({
                children: [new Paragraph('_________________________________')],
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                }
              })
            ]
          })
        ]
      })
    );

    // Create document with all children
    const doc = new Document({
      sections: [{
        properties: {},
        children: children
      }]
    });

    const blob = await Packer.toBlob(doc);
    const fileName = isLegalEntity
      ? `Client_Declaration_${formData.organizationName || 'Organization'}_${formData.date}.docx`
      : `Client_Declaration_${formData.clientName || 'Client'}_${formData.date}.docx`;
    saveAs(blob, fileName);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '32px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h2 style={{ marginBottom: '24px', color: '#1f2937' }}>Generate Client Declaration Form</h2>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
            Client Type
          </label>
          <select
            value={formData.clientType}
            onChange={(e) => handleInputChange('clientType', e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="individual">Individual</option>
            <option value="legal_entity">Legal Entity (Company/Organization)</option>
          </select>
        </div>

        {formData.clientType === 'legal_entity' ? (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                Organization Name
              </label>
              <input
                type="text"
                value={formData.organizationName}
                onChange={(e) => handleInputChange('organizationName', e.target.value)}
                placeholder="Enter organization name"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                Authorized Signatory Name
              </label>
              <input
                type="text"
                value={formData.signatoryName}
                onChange={(e) => handleInputChange('signatoryName', e.target.value)}
                placeholder="Enter signatory name"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                Title/Position
              </label>
              <input
                type="text"
                value={formData.signatoryTitle}
                onChange={(e) => handleInputChange('signatoryTitle', e.target.value)}
                placeholder="e.g., Director, Managing Director, CEO"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </>
        ) : (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
              Full Name
            </label>
            <input
              type="text"
              value={formData.clientName}
              onChange={(e) => handleInputChange('clientName', e.target.value)}
              placeholder="Enter client full name"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
            Date
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.notarized}
              onChange={(e) => handleInputChange('notarized', e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <span style={{ color: '#374151', fontSize: '14px' }}>
              Include Notary Public Certification Section (for Enhanced DD)
            </span>
          </label>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          paddingTop: '20px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#374151',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
          <button
            onClick={generateDeclarationDocument}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#2563eb',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Generate Document
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientDeclarationForm;

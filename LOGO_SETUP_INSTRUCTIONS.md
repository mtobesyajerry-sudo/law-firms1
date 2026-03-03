# Logo Setup Instructions

## Logo File Required

The system is configured to display the **Iuris Peritis** logo in the following locations:

1. **Auth/Login Page** - At the top of the login/registration form
2. **Client Dashboard** - In the header of the main dashboard

## File Location

The logo file must be placed at:
```
/public/Iuris_Peritis_logo_(edit).png
```

## Logo Specifications

- **Format**: PNG with transparency
- **Recommended Width**: 280px (Auth page) and 200px (Dashboard)
- **Aspect Ratio**: Maintains original proportions
- **Colors**: Black and gold scales of justice design

## Implementation Details

### Auth Component (`src/components/Auth.jsx`)
- Logo displays centered above the title
- Max width: 280px
- Includes 20px bottom margin

### Dashboard Component (`src/components/Dashboard.jsx`)
- Logo displays in the header on dark background
- Max width: 200px
- Left-aligned with 16px bottom margin

## Next Steps

1. Save the provided `Iuris_Peritis_logo_(edit).png` to the `/public` directory
2. Build the project: `npm run build`
3. The logo will automatically display in all configured locations

## Branding Consistency

The logo reinforces the **Law Firm AML Compliance System** branding by:
- Using professional legal symbolism (scales of justice)
- Maintaining consistent black and gold color scheme
- Displaying prominently on all user-facing pages
- Creating immediate brand recognition

This replaces the previous generic system branding with the specific **Iuris Peritis** identity.

# Complete Design Specifications - AML/CFT/CPF Risk Assessment System

## Table of Contents
1. [Design System Overview](#design-system-overview)
2. [Authentication Pages](#authentication-pages)
3. [Client Dashboard](#client-dashboard)
4. [Admin Dashboard](#admin-dashboard)
5. [Assessment Introduction](#assessment-introduction)
6. [Assessment Form](#assessment-form)
7. [Assessment Reports](#assessment-reports)
8. [Modal Components](#modal-components)
9. [Print Layouts](#print-layouts)

---

## Design System Overview

### Color Palette

#### Primary Colors
- **Gold Primary**: `#d4af37` (Brand color, CTAs, highlights)
- **Gold Light**: `#f4d03f` (Gradients, hover states)
- **Gold Pale**: `#fef3c7` (Backgrounds, highlights)
- **Gold Subtle**: `#fffbeb` (Very light backgrounds)

#### Dark Colors
- **Navy Primary**: `#0a1929` (Headers, dark text)
- **Navy Secondary**: `#1a2f45` (Gradients, cards)
- **Navy Light**: `#1f2937` (Text, borders)

#### Neutral Colors
- **White**: `#ffffff` (Backgrounds, cards)
- **Gray 50**: `#f9fafb` (Page backgrounds)
- **Gray 100**: `#f8f9fa` (Secondary backgrounds)
- **Gray 200**: `#e8eaed` (Borders, dividers)
- **Gray 300**: `#e2e8f0` (Borders)
- **Gray 400**: `#cbd5e0` (Input borders)
- **Gray 500**: `#a0aec0` (Disabled states)
- **Gray 600**: `#6b7280` (Secondary text)
- **Gray 700**: `#4a5568` (Body text)
- **Gray 800**: `#2d3748` (Dark text)
- **Gray 900**: `#1a202c` (Headings)

#### Status Colors
- **Success Green**: `#10b981` (Success states)
- **Success Light**: `#d1fae5` (Success backgrounds)
- **Success Dark**: `#065f46` (Success text)
- **Warning Yellow**: `#f59e0b` (Warnings)
- **Warning Light**: `#fef3c7` (Warning backgrounds)
- **Warning Dark**: `#92400e` (Warning text)
- **Error Red**: `#ef4444` (Errors, danger)
- **Error Light**: `#fee2e2` (Error backgrounds)
- **Error Dark**: `#991b1b` (Error text)
- **Info Blue**: `#2563eb` (Information)
- **Info Light**: `#dbeafe` (Info backgrounds)
- **Info Dark**: `#1e40af` (Info text)

#### Risk Rating Colors
- **Low Risk**: `#10b981` (Green)
- **Medium Risk**: `#f59e0b` (Yellow/Orange)
- **High Risk**: `#ef4444` (Red)

### Typography

#### Font Families
- **Primary**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif`
- **Monospace**: `source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace`

#### Font Sizes
- **Display**: `36px` (Major page titles)
- **H1**: `32px` (Primary headings)
- **H2**: `28px` (Section headings)
- **H3**: `24px` (Subsection headings)
- **H4**: `20px` (Card titles)
- **H5**: `18px` (Small headings)
- **H6**: `16px` (Micro headings)
- **Body Large**: `16px` (Emphasized text)
- **Body**: `15px` (Body text)
- **Body Small**: `14px` (Secondary text)
- **Caption**: `13px` (Captions, labels)
- **Micro**: `12px` (Labels, badges)
- **Tiny**: `11px` (Micro labels)

#### Font Weights
- **Regular**: `400`
- **Medium**: `500`
- **Semibold**: `600`
- **Bold**: `700`

#### Line Heights
- **Tight**: `1.2` (Headlines)
- **Normal**: `1.5` (UI text)
- **Relaxed**: `1.6` (Readable text)
- **Loose**: `1.7` (Body paragraphs)

#### Letter Spacing
- **Tight**: `-0.8px` (Large headlines)
- **Normal**: `0px` (Body text)
- **Wide**: `0.3px` (Small text)
- **Wider**: `0.5px` (Labels, buttons)
- **Widest**: `1px` (Micro text, uppercase)

### Spacing System
Uses **8px base unit** for consistent spacing:
- **xs**: `4px`
- **sm**: `8px`
- **md**: `12px`
- **lg**: `16px`
- **xl**: `20px`
- **2xl**: `24px`
- **3xl**: `32px`
- **4xl**: `40px`
- **5xl**: `48px`
- **6xl**: `64px`

### Border Radius
- **Small**: `4px` (Buttons, inputs)
- **Medium**: `8px` (Cards, modals)
- **Large**: `12px` (Large cards)
- **XL**: `16px` (Hero cards)

### Shadows
- **Small**: `0 1px 2px rgba(0,0,0,0.05)` (Subtle elevation)
- **Medium**: `0 1px 3px rgba(0,0,0,0.1)` (Cards)
- **Large**: `0 4px 12px rgba(0,0,0,0.15)` (Elevated cards)
- **XL**: `0 8px 32px rgba(0,0,0,0.3)` (Modals)
- **Gold**: `0 4px 12px rgba(212,175,55,0.4)` (Gold buttons)

### Transitions
- **Fast**: `0.2s ease` (Buttons, links)
- **Normal**: `0.3s ease` (Most interactions)
- **Slow**: `0.5s ease` (Large movements)

---

## Authentication Pages

### Login / Sign Up Page

**Layout**: Centered full-screen with gradient background

**Background**: `linear-gradient(135deg, #0a1929 0%, #1a2f45 50%, #0d1f33 100%)`

#### Components

**Container**:
- Min height: `100vh`
- Display: `flex`, centered
- Padding: `20px`

**Card**:
- Background: `white`
- Border radius: `16px`
- Box shadow: `0 20px 60px rgba(0,0,0,0.5)`
- Max width: `450px`
- Padding: `40px`
- Border: `2px solid #d4af37`

**Header Section**:
- Text align: `center`
- Margin bottom: `32px`
- Border bottom: `2px solid #d4af37`
- Padding bottom: `20px`

**Title**:
- Font size: `28px`
- Font weight: `700`
- Color: `#0a1929`
- Margin bottom: `8px`

**Subtitle**:
- Font size: `14px`
- Color: `#4a5568`
- Font weight: `500`

**Form**:
- Display: `flex`, `column`
- Gap: `20px`

**Input Fields**:
- Padding: `12px 16px`
- Font size: `16px`
- Border: `2px solid #cbd5e0`
- Border radius: `8px`
- Background: `#f8f9fa`
- Transition: `all 0.3s ease`

**Focus State**:
- Box shadow: `0 0 0 3px rgba(212, 175, 55, 0.3)`

**Submit Button**:
- Padding: `14px`
- Font size: `16px`
- Font weight: `700`
- Color: `#0a1929`
- Background: `linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)`
- Border: `none`
- Border radius: `8px`
- Box shadow: `0 4px 12px rgba(212,175,55,0.4)`
- Cursor: `pointer`

**Button Hover**:
- Transform: `translateY(-1px)`
- Box shadow: `0 4px 12px rgba(0, 0, 0, 0.15)`

**Error Message**:
- Padding: `12px`
- Background: `#fed7d7`
- Color: `#c53030`
- Border radius: `8px`
- Font size: `14px`

---

## Client Dashboard

### Layout Structure

**Container**:
- Min height: `100vh`
- Background: `linear-gradient(to bottom, #f8f9fa 0%, #e8eaed 100%)`

**Header**:
- Background: `linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)`
- Padding: `32px`
- Color: `white`
- Display: `flex`, space-between
- Box shadow: `0 4px 20px rgba(0,0,0,0.3)`
- Border bottom: `3px solid #d4af37`

**Page Title**:
- Font size: `32px`
- Font weight: `700`
- Color: `#ffffff`
- Text shadow: `2px 2px 4px rgba(0,0,0,0.3)`
- Margin: `0`

**Subtitle**:
- Font size: `16px`
- Color: `#d4af37`
- Font weight: `500`
- Margin: `8px 0 0 0`

**Icon Button**:
- Padding: `10px 14px`
- Background: `transparent`
- Color: `#d4af37`
- Border: `2px solid #d4af37`
- Border radius: `8px`
- Cursor: `pointer`
- Display: `flex`, centered
- Transition: `all 0.3s ease`

**Sign Out Button**:
- Padding: `10px 24px`
- Background: `#d4af37`
- Color: `#0a1929`
- Border: `none`
- Border radius: `8px`
- Font weight: `700`
- Box shadow: `0 2px 8px rgba(212,175,55,0.3)`
- Cursor: `pointer`

### Content Area

**Content Wrapper**:
- Max width: `1200px`
- Margin: `0 auto`
- Padding: `32px`

**Section Card**:
- Background: `white`
- Border radius: `16px`
- Box shadow: `0 4px 20px rgba(0,0,0,0.15)`
- Border: `2px solid #d4af37`
- Padding: `32px`
- Margin bottom: `32px`

**Section Header**:
- Display: `flex`, space-between
- Margin bottom: `24px`
- Padding bottom: `12px`
- Border bottom: `2px solid #d4af37`

**Section Title**:
- Font size: `24px`
- Font weight: `700`
- Color: `#0a1929`
- Margin: `0`

**Primary Button**:
- Padding: `12px 24px`
- Background: `linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)`
- Color: `#0a1929`
- Border: `none`
- Border radius: `8px`
- Font weight: `700`
- Font size: `14px`
- Box shadow: `0 4px 12px rgba(212,175,55,0.4)`
- Cursor: `pointer`

### Tables

**Table Container**:
- Border radius: `8px`
- Overflow: `hidden`

**Table**:
- Width: `100%`
- Border collapse: `collapse`

**Table Header**:
- Padding: `16px`
- Text align: `left`
- Background: `linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)`
- Font weight: `700`
- Color: `#ffffff`
- Font size: `14px`
- Border bottom: `3px solid #d4af37`
- Letter spacing: `0.5px`

**Table Row**:
- Border bottom: `1px solid #e8eaed`
- Transition: `background 0.2s ease`

**Table Row Hover**:
- Background: `#f9fafb`

**Table Data**:
- Padding: `16px`
- Color: `#2d3748`
- Font size: `14px`

**Badge**:
- Padding: `4px 12px`
- Border radius: `12px`
- Font size: `12px`
- Font weight: `600`
- Display: `inline-block`

**Status Badges**:
- **Completed**: Background `#d1fae5`, Color `#065f46`
- **Draft/Pending**: Background `#fef3c7`, Color `#92400e`
- **Active**: Background `#d1fae5`, Color `#065f46`
- **Inactive**: Background `#fee2e2`, Color `#991b1b`

**Action Buttons**:
- Padding: `6px 16px`
- Background: `transparent`
- Color: `#0a1929`
- Border: `2px solid #d4af37`
- Border radius: `6px`
- Font weight: `600`
- Font size: `13px`
- Cursor: `pointer`
- Transition: `all 0.3s ease`

**Danger Button**:
- Color: `#ef4444`
- Border: `1px solid #ef4444`
- Padding: `6px 12px`
- Font size: `12px`

### Footer

**Footer**:
- Background: `linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)`
- Padding: `24px 32px`
- Color: `#ffffff`
- Display: `flex`, space-between
- Border top: `3px solid #d4af37`
- Margin top: `48px`

**Copyright**:
- Font size: `14px`
- Color: `#d4af37`
- Font weight: `500`

**Footer Links**:
- Color: `#ffffff`
- Text decoration: `none`
- Font size: `14px`
- Font weight: `500`
- Transition: `all 0.3s ease`
- Cursor: `pointer`

**Footer Link Hover**:
- Color: `#d4af37`
- Transform: `translateY(-2px)`

**Footer Divider**:
- Color: `#d4af37`
- Font size: `14px`
- Margin: `0 16px`

---

## Admin Dashboard

### Layout Structure

**Container**: Same as Client Dashboard

**Header**:
- Background: `linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)`
- Padding: `32px`
- Margin: `24px 24px 0 24px`
- Border radius: `12px 12px 0 0`
- Border bottom: `3px solid #d4af37`
- Box shadow: `0 4px 20px rgba(0,0,0,0.3)`

**Content**:
- Max width: `1400px`
- Margin: `0 24px 24px 24px`
- Padding: `24px 32px 32px 32px`
- Background: `white`
- Border radius: `0 0 12px 12px`
- Box shadow: `0 4px 20px rgba(0,0,0,0.1)`

### Tabs Navigation

**Tabs Container**:
- Display: `flex`
- Gap: `8px`
- Margin bottom: `32px`
- Border bottom: `3px solid #d4af37`

**Tab Button**:
- Padding: `12px 24px`
- Background: `transparent`
- Border: `none`
- Border bottom: `3px solid transparent`
- Font size: `15px`
- Font weight: `600`
- Color: `#718096`
- Cursor: `pointer`
- Transition: `all 0.3s`

**Active Tab**:
- Color: `#0a1929`
- Border bottom color: `#d4af37`
- Font weight: `700`

### Tab Content

**Tab Content Container**:
- Background: `white`
- Border radius: `12px`
- Padding: `32px`
- Box shadow: `0 4px 16px rgba(0,0,0,0.15)`
- Border: `1px solid #d4af37`

**Section Header**:
- Display: `flex`, space-between
- Padding: `20px 24px`
- Background: `linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)`
- Border radius: `12px`
- Border: `2px solid #d4af37`
- Box shadow: `0 2px 8px rgba(212,175,55,0.15)`
- Margin bottom: `24px`

### Forms

**Form Container**:
- Margin bottom: `32px`
- Padding: `24px`
- Background: `#f8f9fa`
- Border radius: `12px`
- Border: `1px solid #d4af37`

**Form Grid**:
- Display: `grid`
- Grid template columns: `repeat(2, 1fr)`
- Gap: `16px`
- Margin bottom: `16px`

**Form Group**:
- Display: `flex`, `column`
- Gap: `8px`

**Label**:
- Font size: `14px`
- Font weight: `700`
- Color: `#0a1929`
- Margin bottom: `8px`

**Input**:
- Padding: `10px 12px`
- Border: `2px solid #cbd5e0`
- Border radius: `8px`
- Font size: `14px`
- Background: `#ffffff`
- Width: `100%`

**Select**:
- Padding: `10px 12px`
- Border: `2px solid #cbd5e0`
- Border radius: `8px`
- Font size: `14px`
- Background: `#ffffff`

**Submit Button**:
- Padding: `12px 24px`
- Background: `linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)`
- Color: `#0a1929`
- Border: `none`
- Border radius: `8px`
- Font weight: `700`
- Font size: `14px`
- Box shadow: `0 4px 12px rgba(212,175,55,0.4)`
- Cursor: `pointer`

### Cards Grid

**Grid Container**:
- Display: `grid`
- Grid template columns: `repeat(auto-fill, minmax(300px, 1fr))`
- Gap: `24px`

**Card**:
- Background: `white`
- Padding: `20px`
- Border radius: `12px`
- Border: `2px solid #d4af37`
- Box shadow: `0 2px 8px rgba(212,175,55,0.2)`

**Card Title**:
- Font size: `18px`
- Font weight: `700`
- Color: `#0a1929`
- Margin: `0 0 8px 0`

**Card Text**:
- Font size: `14px`
- Color: `#4a5568`
- Margin: `0 0 4px 0`

**Card Subtext**:
- Font size: `13px`
- Color: `#718096`
- Margin: `0 0 4px 0`

### Subscriptions Tab

**Subscription Card**:
- Background: `#f7fafc`
- Padding: `24px`
- Border radius: `12px`
- Border: `2px solid #e2e8f0`
- Margin bottom: `32px`

**Subscription Card Title**:
- Font size: `20px`
- Font weight: `700`
- Color: `#1a202c`
- Margin: `0 0 16px 0`

**Date Input**:
- Padding: `4px 8px`
- Border: `1px solid #e2e8f0`
- Border radius: `4px`
- Font size: `12px`
- Margin top: `4px`

**Suspension Reason Display**:
- Font size: `13px`
- Color: `#718096`
- Font style: `italic`
- Max width: `300px`

### Content Management Tab

**Content Grid**:
- Display: `grid`
- Grid template columns: `repeat(auto-fill, minmax(300px, 1fr))`
- Gap: `24px`

**Content Card**:
- Background: `#f8f9fa`
- Padding: `24px`
- Border radius: `12px`
- Border: `2px solid #d4af37`
- Box shadow: `0 2px 8px rgba(212,175,55,0.2)`

**Content Card Title**:
- Font size: `20px`
- Font weight: `700`
- Color: `#0a1929`
- Margin: `0 0 12px 0`

**Content Card Meta**:
- Font size: `13px`
- Color: `#718096`
- Margin: `0 0 16px 0`

**Formatting Toolbar**:
- Display: `flex`
- Gap: `8px`
- Padding: `8px`
- Background: `#f8f9fa`
- Border radius: `8px`
- Border: `2px solid #cbd5e0`
- Margin bottom: `8px`

**Format Button**:
- Padding: `8px 16px`
- Background: `#ffffff`
- Color: `#0a1929`
- Border: `2px solid #d4af37`
- Border radius: `6px`
- Font size: `16px`
- Font weight: `600`
- Cursor: `pointer`
- Min width: `40px`
- Display: `flex`, centered

**Large Textarea**:
- Width: `100%`
- Padding: `12px`
- Border: `2px solid #cbd5e0`
- Border radius: `8px`
- Font size: `14px`
- Font family: `monospace`
- Background: `#f8f9fa`
- Resize: `vertical`

### Organization Assessment Card

**Card Container**:
- Background: `#f8f9fa`
- Padding: `24px`
- Border radius: `12px`
- Border: `2px solid #d4af37`
- Margin bottom: `24px`
- Box shadow: `0 4px 12px rgba(212,175,55,0.15)`

**Card Header**:
- Display: `flex`, space-between
- Margin bottom: `20px`
- Padding bottom: `16px`
- Border bottom: `2px solid #d4af37`

**Organization Title**:
- Font size: `20px`
- Font weight: `700`
- Color: `#0a1929`
- Margin: `0 0 6px 0`

**Organization Subtitle**:
- Font size: `14px`
- Color: `#718096`
- Font weight: `500`
- Margin: `0`

**Stats Container**:
- Display: `flex`
- Gap: `12px`
- Align items: `center`

---

## Assessment Introduction

### Layout

**Container**:
- Min height: `100vh`
- Background: `#f9fafb`

**Content**:
- Max width: `900px`
- Margin: `0 auto`
- Padding: `48px 32px`

**Header**:
- Background: `linear-gradient(135deg, #ffffff 0%, #fefefe 100%)`
- Padding: `48px`
- Border radius: `12px`
- Box shadow: `0 10px 40px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)`
- Border: `2px solid rgba(212, 175, 55, 0.25)`
- Margin bottom: `32px`

**Page Title**:
- Font size: `36px`
- Font weight: `700`
- Color: `#1a202c`
- Letter spacing: `-0.8px`
- Margin: `0 0 16px 0`

**Subtitle**:
- Font size: `24px`
- Font weight: `600`
- Color: `#d4af37`
- Margin: `0 0 16px 0`

**Description**:
- Font size: `16px`
- Color: `#4a5568`
- Line height: `1.7`
- Text align: `justify`

**Back Button**:
- Display: `inline-flex`, centered
- Gap: `8px`
- Background: `#ffffff`
- Color: `#6b7280`
- Border: `2px solid #e2e8f0`
- Padding: `12px 24px`
- Font size: `13px`
- Font weight: `600`
- Border radius: `8px`
- Box shadow: `0 2px 8px rgba(0,0,0,0.08)`
- Margin top: `24px`
- Cursor: `pointer`

### Form Sections

**Section**:
- Background: `white`
- Padding: `32px`
- Border radius: `12px`
- Box shadow: `0 4px 16px rgba(0,0,0,0.08)`
- Border: `1px solid #e2e8f0`
- Margin bottom: `24px`

**Section Title**:
- Font size: `20px`
- Font weight: `700`
- Color: `#1a202c`
- Margin: `0 0 24px 0`
- Padding bottom: `12px`
- Border bottom: `2px solid #d4af37`

**Form Row**:
- Display: `grid`
- Grid template columns: `repeat(2, 1fr)`
- Gap: `20px`
- Margin bottom: `20px`

**Category Badge** (for locked DNFBP):
- Background: `#fef3c7`
- Color: `#92400e`
- Padding: `12px 20px`
- Border radius: `8px`
- Font size: `15px`
- Font weight: `600`
- Border: `2px solid #fbbf24`

**Required Indicator**:
- Color: `#ef4444`
- Font weight: `700`

**Textarea**:
- Width: `100%`
- Padding: `12px 16px`
- Border: `2px solid #cbd5e0`
- Border radius: `8px`
- Font size: `14px`
- Font family: `inherit`
- Line height: `1.6`
- Resize: `vertical`
- Min height: `80px`

**Info Box**:
- Background: `#fffbeb`
- Border: `2px solid #fbbf24`
- Border radius: `8px`
- Padding: `16px`
- Margin top: `12px`

**Info Text**:
- Font size: `13px`
- Color: `#78350f`
- Line height: `1.6`
- Margin: `0`

**Error Text**:
- Font size: `13px`
- Color: `#ef4444`
- Font weight: `500`
- Margin top: `6px`
- Display: `block`

**Input Error State**:
- Border color: `#ef4444`
- Background: `#fef2f2`

**Submit Button**:
- Width: `100%`
- Padding: `16px`
- Background: `linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)`
- Color: `#0a1929`
- Border: `none`
- Border radius: `8px`
- Font size: `16px`
- Font weight: `700`
- Box shadow: `0 4px 12px rgba(212,175,55,0.4)`
- Cursor: `pointer`
- Transition: `all 0.3s ease`

**Submit Button Hover**:
- Transform: `translateY(-2px)`
- Box shadow: `0 8px 24px rgba(212, 175, 55, 0.45)`
- Background: `linear-gradient(135deg, #e5c158 0%, #f5d96b 100%)`

---

## Assessment Form

### Layout Structure

**Container**:
- Min height: `100vh`
- Background: `#f9fafb`

**Header Wrapper**:
- Padding: `32px 32px 24px 32px`
- Background: `#f9fafb`

**Header**:
- Background: `linear-gradient(135deg, #ffffff 0%, #fefefe 100%)`
- Padding: `48px`
- Border radius: `12px`
- Box shadow: `0 10px 40px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)`
- Border: `2px solid rgba(212, 175, 55, 0.25)`
- Max width: `1400px`
- Margin: `0 auto`
- Text align: `justify`

**Header Title**:
- Font size: `36px`
- Font weight: `700`
- Color: `#1a202c`
- Letter spacing: `-0.8px`
- Margin: `0 0 16px 0`

**Header Description**:
- Font size: `16px`
- Color: `#4a5568`
- Line height: `1.7`
- Text align: `justify`
- Margin: `0`

**Back Button**:
- Display: `inline-flex`, centered
- Gap: `8px`
- Background: `#ffffff`
- Color: `#6b7280`
- Border: `2px solid #e2e8f0`
- Padding: `12px 24px`
- Font size: `13px`
- Font weight: `600`
- Border radius: `8px`
- Box shadow: `0 2px 8px rgba(0,0,0,0.08)`
- Margin top: `24px`
- Cursor: `pointer`

### Tier Banner

**Banner Wrapper**:
- Padding: `24px 32px 32px 32px`
- Background: `#f9fafb`

**Banner**:
- Background: `linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fffbeb 100%)`
- Padding: `32px 48px`
- Border radius: `12px`
- Box shadow: `0 10px 40px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)`
- Border: `2px solid rgba(212, 175, 55, 0.4)`
- Max width: `1400px`
- Margin: `0 auto`

**Banner Content**:
- Display: `flex`
- Align items: `center`
- Gap: `32px`

**Tier Badge**:
- Display: `flex`, `column`, centered
- Padding: `20px 28px`
- Background: `linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)`
- Border radius: `8px`
- Border: `2px solid #d4af37`
- Box shadow: `0 4px 12px rgba(212,175,55,0.15)`
- Min width: `160px`

**Tier Label**:
- Font size: `11px`
- Color: `#92400e`
- Font weight: `700`
- Text transform: `uppercase`
- Letter spacing: `1px`
- Margin bottom: `8px`

**Tier Value**:
- Font size: `22px`
- Color: `#1a202c`
- Font weight: `700`
- Letter spacing: `-0.5px`

**Tier Description**:
- Font size: `15px`
- Color: `#4a5568`
- Font weight: `500`
- Line height: `1.7`
- Text align: `justify`
- Margin: `0 0 12px 0`

**Question Count**:
- Font size: `13px`
- Color: `#6b7280`
- Font weight: `600`
- Margin: `0`

### Progress Bar

**Progress Bar**:
- Height: `4px`
- Background: `#e5e7eb`

**Progress Fill**:
- Height: `100%`
- Background: `#d4af37`
- Transition: `width 0.3s ease`

### Main Content

**Content**:
- Display: `flex`
- Max width: `1400px`
- Margin: `0 auto`
- Padding: `32px`
- Gap: `32px`

**Section Navigation**:
- Width: `280px`
- Display: `flex`, `column`
- Gap: `12px`

**Section Nav Item**:
- Display: `flex`, centered
- Gap: `12px`
- Padding: `14px 18px`
- Background: `#ffffff`
- Border: `1px solid #d1d5db`
- Border radius: `4px`
- Text align: `left`
- Box shadow: `0 1px 3px rgba(0,0,0,0.05)`
- Cursor: `pointer`
- Transition: `all 0.2s`

**Active Section Item**:
- Border color: `#d4af37`
- Border width: `2px`
- Background: `#ffffff`
- Box shadow: `0 1px 3px rgba(212,175,55,0.2)`

**Completed Section Item**:
- Border color: `#10b981`
- Background: `#f0fdf4`

**Section Code Badge**:
- Min width: `50px`
- Height: `36px`
- Display: `flex`, centered
- Background: `linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)`
- Color: `#d4af37`
- Border radius: `4px`
- Font weight: `700`
- Font size: `11px`
- Letter spacing: `0.2px`
- Padding: `0 8px`
- White space: `nowrap`

**Section Nav Text**:
- Font size: `12px`
- Font weight: `600`
- Color: `#374151`
- Text transform: `uppercase`
- Letter spacing: `0.3px`

**Main Content Area**:
- Flex: `1`

### Section Header

**Section Header**:
- Background: `#ffffff`
- Padding: `20px 24px`
- Border radius: `4px`
- Border: `1px solid #e5e7eb`
- Box shadow: `0 1px 3px rgba(0,0,0,0.05)`
- Margin bottom: `28px`

**Section Title**:
- Font size: `20px`
- Font weight: `700`
- Color: `#1f2937`
- Border bottom: `2px solid #d4af37`
- Padding bottom: `10px`
- Text transform: `uppercase`
- Letter spacing: `0.5px`
- Margin: `0 0 12px 0`

**Section Description**:
- Font size: `14px`
- Color: `#6b7280`
- Line height: `1.7`
- Text align: `justify`
- Margin: `0`

### Subsection

**Subsection Header**:
- Margin: `32px 0 20px 0`
- Padding bottom: `12px`
- Border bottom: `2px solid #d4af37`

**Subsection Title**:
- Font size: `16px`
- Font weight: `700`
- Color: `#1f2937`
- Text transform: `uppercase`
- Letter spacing: `0.5px`
- Margin: `0`

### Question Card

**Question Card**:
- Background: `#ffffff`
- Padding: `24px`
- Border radius: `4px`
- Box shadow: `0 1px 3px rgba(0,0,0,0.1)`
- Border: `1px solid #e5e7eb`
- Margin bottom: `24px`

**Question Header**:
- Display: `flex`
- Gap: `16px`
- Margin bottom: `18px`

**Question Number**:
- Width: `42px`
- Height: `42px`
- Display: `flex`, centered
- Background: `#f9fafb`
- Color: `#6b7280`
- Border radius: `4px`
- Font weight: `700`
- Font size: `14px`
- Border: `1px solid #d1d5db`
- Flex shrink: `0`

**Question Text**:
- Font size: `15px`
- Font weight: `600`
- Color: `#1f2937`
- Line height: `1.6`
- Text align: `justify`
- Margin: `0`

### Response Options

**Response Options Container**:
- Display: `flex`
- Gap: `12px`
- Margin bottom: `16px`

**Response Button**:
- Flex: `1`
- Padding: `12px 16px`
- Background: `#ffffff`
- Border: `1px solid #d1d5db`
- Border radius: `4px`
- Font size: `12px`
- Font weight: `700`
- Color: `#6b7280`
- Text transform: `uppercase`
- Letter spacing: `0.3px`
- Box shadow: `0 1px 2px rgba(0,0,0,0.05)`
- Cursor: `pointer`
- Transition: `all 0.2s`

**Active Response Button**:
- Background: `#d4af37`
- Border color: `#d4af37`
- Color: `#ffffff`
- Box shadow: `0 1px 3px rgba(212,175,55,0.3)`

### Effectiveness Rating Section

**Section Container**:
- Margin bottom: `18px`
- Padding: `18px`
- Background: `#fffbeb`
- Border radius: `4px`
- Border: `1px solid #fbbf24`

**Label**:
- Font size: `12px`
- Font weight: `700`
- Color: `#1f2937`
- Text transform: `uppercase`
- Letter spacing: `0.5px`
- Margin: `0 0 12px 0`

### Notes/Text Input

**Notes Input**:
- Width: `100%`
- Padding: `12px 14px`
- Border: `1px solid #d1d5db`
- Border radius: `4px`
- Font size: `14px`
- Font family: `inherit`
- Resize: `vertical`
- Min height: `60px`
- Background: `#f9fafb`
- Color: `#374151`

**Text Response Area**:
- Width: `100%`
- Padding: `14px 16px`
- Border: `1px solid #d1d5db`
- Border radius: `4px`
- Font size: `14px`
- Font family: `inherit`
- Resize: `vertical`
- Min height: `120px`
- Line height: `1.6`
- Background: `#f9fafb`
- Color: `#374151`
- Margin bottom: `8px`

### Attachment Section

**Attachment Section**:
- Margin top: `20px`
- Padding: `18px`
- Background: `#f9fafb`
- Border radius: `4px`
- Border: `1px dashed #d1d5db`

**Attachment Header**:
- Display: `flex`, space-between
- Margin bottom: `14px`

**Attachment Label**:
- Font size: `12px`
- Font weight: `700`
- Color: `#374151`
- Text transform: `uppercase`
- Letter spacing: `0.5px`

**Tier Badge** (Mandatory/Recommended/Optional):
- Font size: `11px`
- Font weight: `700`
- Color: `white`
- Padding: `4px 10px`
- Border radius: `12px`
- Letter spacing: `0.5px`
- **Mandatory**: Background `#dc2626`
- **Recommended**: Background `#f59e0b`
- **Optional**: Background `#10b981`

**Evidence Hint**:
- Font size: `13px`
- Color: `#4a5568`
- Padding: `8px`
- Background: `#edf2f7`
- Border radius: `4px`
- Line height: `1.5`
- Margin: `0 0 8px 0`

**Importance Note**:
- Font size: `13px`
- Color: `#2d3748`
- Padding: `8px`
- Background: `#e6fffa`
- Border left: `3px solid #38b2ac`
- Border radius: `4px`
- Line height: `1.5`
- Margin: `0 0 12px 0`

**Declaration Box**:
- Padding: `12px`
- Background: `#fffbeb`
- Border: `1px solid #fcd34d`
- Border radius: `6px`
- Margin: `12px 0`

**Declaration Label**:
- Display: `flex`, start
- Gap: `10px`
- Font size: `13px`
- Line height: `1.5`
- Cursor: `pointer`

**Declaration Checkbox**:
- Width: `18px`
- Height: `18px`
- Margin top: `2px`
- Cursor: `pointer`

**Declaration Text**:
- Flex: `1`
- Color: `#78350f`
- Font weight: `500`

**File Upload Area**:
- Text align: `center`
- Padding: `12px`

**File Upload Button**:
- Display: `inline-block`
- Padding: `10px 24px`
- Background: `#6b7280`
- Color: `#ffffff`
- Border radius: `4px`
- Font size: `12px`
- Font weight: `700`
- Text transform: `uppercase`
- Letter spacing: `0.3px`
- Box shadow: `0 1px 2px rgba(0,0,0,0.1)`
- Cursor: `pointer`
- Transition: `all 0.2s`

**File Upload Hint**:
- Font size: `12px`
- Color: `#718096`
- Margin: `8px 0 0 0`

**Attachments List**:
- Margin top: `16px`
- Display: `flex`, `column`
- Gap: `8px`

**Attachment Item**:
- Display: `flex`, space-between, centered
- Padding: `12px`
- Background: `white`
- Border radius: `6px`
- Border: `1px solid #e2e8f0`

**Attachment Info**:
- Display: `flex`, centered
- Gap: `12px`
- Flex: `1`

**Attachment Icon**:
- Font size: `24px`

**Attachment Name**:
- Font size: `14px`
- Font weight: `600`
- Color: `#2d3748`
- Margin: `0 0 4px 0`

**Attachment Meta**:
- Font size: `12px`
- Color: `#718096`
- Margin: `0`

**Delete Button**:
- Width: `28px`
- Height: `28px`
- Display: `flex`, centered
- Background: `#fee2e2`
- Color: `#dc2626`
- Border: `none`
- Border radius: `6px`
- Font size: `20px`
- Font weight: `700`
- Cursor: `pointer`
- Transition: `all 0.2s`

### Navigation Buttons

**Navigation Buttons Container**:
- Display: `flex`, space-between, centered
- Margin top: `32px`
- Padding: `20px 24px`
- Background: `#ffffff`
- Border radius: `4px`
- Box shadow: `0 1px 3px rgba(0,0,0,0.1)`
- Border: `1px solid #e5e7eb`

**Nav Button**:
- Padding: `12px 28px`
- Background: `#ffffff`
- Border: `1px solid #d1d5db`
- Border radius: `4px`
- Font size: `12px`
- Font weight: `700`
- Color: `#6b7280`
- Text transform: `uppercase`
- Letter spacing: `0.5px`
- Box shadow: `0 1px 2px rgba(0,0,0,0.05)`
- Cursor: `pointer`
- Transition: `all 0.2s`

**Disabled Nav Button**:
- Opacity: `0.4`
- Cursor: `not-allowed`

**Primary Nav Button**:
- Padding: `12px 28px`
- Background: `#d4af37`
- Color: `#ffffff`
- Border: `none`
- Border radius: `4px`
- Font size: `12px`
- Font weight: `700`
- Text transform: `uppercase`
- Letter spacing: `0.5px`
- Box shadow: `0 1px 3px rgba(212,175,55,0.3)`
- Cursor: `pointer`
- Transition: `all 0.2s ease`

**Saving Indicator**:
- Color: `#718096`
- Font size: `14px`

### Disclaimer Screen

**Disclaimer Content**:
- Max width: `900px`
- Margin: `0 auto`
- Padding: `32px`

**Disclaimer Compact Card**:
- Background: `white`
- Border radius: `16px`
- Padding: `32px`
- Box shadow: `0 4px 16px rgba(0,0,0,0.1)`

**Disclaimer Toggle**:
- Width: `100%`
- Display: `flex`, centered
- Gap: `16px`
- Padding: `20px`
- Background: `#fef3c7`
- Border: `2px solid #f59e0b`
- Border radius: `12px`
- Text align: `left`
- Margin bottom: `24px`
- Cursor: `pointer`
- Transition: `all 0.2s ease`

**Warning Icon**:
- Font size: `32px`

**Toggle Title**:
- Font size: `18px`
- Font weight: `700`
- Color: `#1a202c`
- Margin: `0 0 4px 0`

**Toggle Subtitle**:
- Font size: `14px`
- Color: `#78350f`
- Margin: `0`

**Toggle Arrow**:
- Font size: `20px`
- Color: `#f59e0b`
- Font weight: `700`

**Expanded Content**:
- Background: `#fffbeb`
- Border: `2px solid #fcd34d`
- Border radius: `12px`
- Padding: `24px`
- Margin bottom: `24px`

**Disclaimer Box**:
- Background: `#fef9c3`
- Border: `2px solid #eab308`
- Border radius: `8px`
- Padding: `16px`
- Margin bottom: `16px`

**Main Text**:
- Font size: `16px`
- Color: `#78350f`
- Line height: `1.7`
- Text align: `justify`
- Margin: `0`

**Disclaimer List**:
- Margin: `16px 0`
- Padding left: `24px`
- Color: `#4a5568`

**List Item**:
- Font size: `15px`
- Line height: `1.6`
- Text align: `justify`
- Margin bottom: `12px`

**Checkbox Container**:
- Background: `#f7fafc`
- Border: `2px solid #e2e8f0`
- Border radius: `12px`
- Padding: `20px`
- Margin bottom: `32px`

**Checkbox Label**:
- Display: `flex`, start
- Gap: `12px`
- Cursor: `pointer`

**Checkbox**:
- Width: `20px`
- Height: `20px`
- Margin top: `2px`
- Cursor: `pointer`
- Flex shrink: `0`

**Checkbox Text**:
- Font size: `15px`
- Color: `#2d3748`
- Line height: `1.6`
- Font weight: `500`
- Text align: `justify`

**Action Buttons**:
- Display: `flex`
- Gap: `16px`
- Justify content: `center`

**Cancel Button**:
- Padding: `14px 32px`
- Background: `#e2e8f0`
- Color: `#2d3748`
- Border: `none`
- Border radius: `8px`
- Font weight: `600`
- Font size: `16px`
- Cursor: `pointer`

**Accept Button**:
- Padding: `14px 32px`
- Background: `linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)`
- Color: `#0a1929`
- Border: `none`
- Border radius: `8px`
- Font weight: `700`
- Font size: `16px`
- Box shadow: `0 4px 12px rgba(212,175,55,0.4)`
- Cursor: `pointer`
- Transition: `all 0.3s ease`

**Button Disabled**:
- Opacity: `0.5`
- Cursor: `not-allowed`

---

## Assessment Reports

### Report Overview Page

**Container**:
- Min height: `100vh`
- Background: `#f9fafb`
- Padding: `32px`

**Header**:
- Background: `linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)`
- Padding: `48px`
- Border radius: `12px 12px 0 0`
- Color: `white`
- Border bottom: `3px solid #d4af37`
- Box shadow: `0 4px 20px rgba(0,0,0,0.3)`

**Report Title**:
- Font size: `36px`
- Font weight: `700`
- Color: `#ffffff`
- Margin: `0 0 12px 0`
- Text shadow: `2px 2px 4px rgba(0,0,0,0.3)`

**Organization Name**:
- Font size: `20px`
- Color: `#d4af37`
- Font weight: `600`
- Margin: `0 0 24px 0`

**Meta Information**:
- Display: `flex`
- Gap: `32px`
- Flex wrap: `wrap`

**Meta Item**:
- Display: `flex`, `column`
- Gap: `4px`

**Meta Label**:
- Font size: `11px`
- Color: `#d4af37`
- Font weight: `700`
- Text transform: `uppercase`
- Letter spacing: `1px`

**Meta Value**:
- Font size: `16px`
- Color: `#ffffff`
- Font weight: `600`

**Overall Risk Badge**:
- Display: `inline-block`
- Padding: `8px 20px`
- Border radius: `8px`
- Font size: `16px`
- Font weight: `700`
- Text transform: `uppercase`
- Letter spacing: `0.5px`
- Color: `white`
- Box shadow: `0 2px 8px rgba(0,0,0,0.2)`

### Report Actions

**Actions Container**:
- Display: `flex`
- Gap: `16px`
- Flex wrap: `wrap`
- Margin top: `24px`

**Action Button**:
- Padding: `12px 24px`
- Background: `transparent`
- Color: `#d4af37`
- Border: `2px solid #d4af37`
- Border radius: `8px`
- Font weight: `700`
- Font size: `14px`
- Cursor: `pointer`
- Display: `flex`, centered
- Gap: `8px`
- Transition: `all 0.3s ease`

**Primary Report Button**:
- Background: `#d4af37`
- Color: `#0a1929`
- Border: `none`

**Back Button**:
- Background: `rgba(212, 175, 55, 0.1)`
- Border: `2px solid #d4af37`
- Color: `#d4af37`

### Report Content Sections

**Content Container**:
- Background: `white`
- Border radius: `0 0 12px 12px`
- Padding: `48px`
- Box shadow: `0 4px 20px rgba(0,0,0,0.15)`

**Summary Card**:
- Background: `#f8f9fa`
- Border: `2px solid #d4af37`
- Border radius: `12px`
- Padding: `32px`
- Margin bottom: `32px`

**Summary Title**:
- Font size: `24px`
- Font weight: `700`
- Color: `#0a1929`
- Margin: `0 0 20px 0`
- Padding bottom: `12px`
- Border bottom: `2px solid #d4af37`

**Summary Text**:
- Font size: `15px`
- Line height: `1.7`
- Color: `#2d3748`
- Text align: `justify`

**Section Scores Card**:
- Background: `white`
- Border: `2px solid #e2e8f0`
- Border radius: `12px`
- Padding: `32px`
- Margin bottom: `32px`

**Score Grid**:
- Display: `grid`
- Grid template columns: `repeat(auto-fit, minmax(280px, 1fr))`
- Gap: `20px`
- Margin top: `24px`

**Score Item**:
- Background: `#f9fafb`
- Border: `1px solid #e2e8f0`
- Border radius: `8px`
- Padding: `20px`
- Transition: `all 0.2s ease`

**Score Item Hover**:
- Border color: `#d4af37`
- Box shadow: `0 2px 8px rgba(212,175,55,0.15)`

**Score Header**:
- Display: `flex`, space-between, centered
- Margin bottom: `12px`

**Score Section Name**:
- Font size: `14px`
- Font weight: `700`
- Color: `#1a202c`
- Text transform: `uppercase`
- Letter spacing: `0.3px`

**Risk Level Badge**:
- Padding: `4px 12px`
- Border radius: `12px`
- Font size: `11px`
- Font weight: `700`
- Text transform: `uppercase`
- Letter spacing: `0.5px`

**Score Metrics**:
- Display: `flex`
- Gap: `16px`
- Margin top: `12px`

**Metric**:
- Display: `flex`, `column`
- Gap: `4px`

**Metric Label**:
- Font size: `11px`
- Color: `#718096`
- Font weight: `600`
- Text transform: `uppercase`
- Letter spacing: `0.5px`

**Metric Value**:
- Font size: `20px`
- Color: `#1a202c`
- Font weight: `700`

### Remediation Actions

**Remediation Card**:
- Background: `white`
- Border: `2px solid #e2e8f0`
- Border radius: `12px`
- Padding: `32px`
- Margin bottom: `32px`

**Add Action Button**:
- Padding: `12px 24px`
- Background: `#10b981`
- Color: `white`
- Border: `none`
- Border radius: `8px`
- Font weight: `700`
- Font size: `14px`
- Cursor: `pointer`

**Action List**:
- Display: `flex`, `column`
- Gap: `16px`
- Margin top: `24px`

**Action Item**:
- Background: `#f9fafb`
- Border: `1px solid #e2e8f0`
- Border left: `4px solid` (varies by priority)
- Border radius: `8px`
- Padding: `20px`

**Priority Colors**:
- **High**: `#ef4444`
- **Medium**: `#f59e0b`
- **Low**: `#10b981`

**Action Header**:
- Display: `flex`, space-between, centered
- Margin bottom: `12px`

**Weakness Description**:
- Font size: `15px`
- Font weight: `700`
- Color: `#1a202c`
- Margin: `0`

**Priority Badge**:
- Padding: `4px 12px`
- Border radius: `12px`
- Font size: `11px`
- Font weight: `700`
- Text transform: `uppercase`

**Mitigation Text**:
- Font size: `14px`
- Color: `#4a5568`
- Line height: `1.6`
- Margin: `12px 0`

**Action Footer**:
- Display: `flex`, space-between
- Margin top: `16px`
- Padding top: `12px`
- Border top: `1px solid #e2e8f0`

**Action Meta**:
- Font size: `12px`
- Color: `#718096`

**Status Select**:
- Padding: `6px 12px`
- Border: `1px solid #d1d5db`
- Border radius: `6px`
- Font size: `13px`
- Font weight: `600`
- Background: `white`

---

## Modal Components

### Standard Modal

**Modal Overlay**:
- Position: `fixed`
- Top/Left/Right/Bottom: `0`
- Background: `rgba(0, 0, 0, 0.5)`
- Display: `flex`, centered
- Z-index: `1000`

**Modal Content**:
- Background: `white`
- Padding: `32px`
- Border radius: `12px`
- Max width: `500px`
- Width: `90%`
- Border: `2px solid #d4af37`
- Box shadow: `0 8px 32px rgba(0,0,0,0.3)`

**Large Modal Content**:
- Max width: `900px`
- Max height: `90vh`
- Overflow Y: `auto`

**Modal Title**:
- Font size: `24px`
- Font weight: `700`
- Color: `#0a1929`
- Border bottom: `2px solid #d4af37`
- Padding bottom: `12px`
- Margin: `0 0 16px 0`

**Modal Text**:
- Font size: `14px`
- Color: `#2d3748`
- Line height: `1.6`
- Margin: `0 0 16px 0`

**Modal Actions**:
- Display: `flex`
- Gap: `12px`
- Justify content: `flex-end`
- Margin top: `24px`

**Cancel Button**:
- Padding: `10px 24px`
- Background: `#f0f0f0`
- Color: `#2d3748`
- Border: `2px solid #cbd5e0`
- Border radius: `8px`
- Font weight: `600`
- Font size: `14px`
- Cursor: `pointer`
- Transition: `all 0.3s ease`

**Confirm Button**:
- Padding: `10px 24px`
- Background: `#d4af37`
- Color: `#0a1929`
- Border: `none`
- Border radius: `8px`
- Font weight: `700`
- Font size: `14px`
- Cursor: `pointer`

**Danger Button**:
- Background: `#ef4444`
- Color: `white`

### Delete Confirmation Modal

**Alert Icon**:
- Font size: `48px`
- Color: `#ef4444`
- Text align: `center`
- Margin bottom: `16px`

**Warning Text**:
- Color: `#ef4444`
- Font size: `13px`
- Font weight: `600`
- Text align: `center`

### Privacy Policy / Terms Modal

**Content Container**:
- Background: `white`
- Border radius: `12px`
- Width: `90%`
- Max width: `800px`
- Max height: `90vh`
- Box shadow: `0 8px 32px rgba(0, 0, 0, 0.12)`
- Display: `flex`, `column`

**Modal Title**:
- Padding: `24px 32px 0`
- Font size: `24px`
- Font weight: `700`
- Color: `#0a1929`
- Border bottom: `2px solid #d4af37`
- Padding bottom: `16px`

**Scroll Area**:
- Flex: `1`
- Overflow Y: `auto`
- Padding: `32px`
- Padding top: `24px`

**Content Text**:
- Font size: `15px`
- Line height: `1.7`
- Color: `#475569`
- Margin bottom: `12px`

**Section Title**:
- Font size: `20px`
- Font weight: `700`
- Color: `#0a1929`
- Margin: `24px 0 16px 0`

**Subsection Title**:
- Font size: `16px`
- Font weight: `600`
- Color: `#1e293b`
- Margin: `16px 0 12px 0`

**Modal Footer**:
- Padding: `20px 32px`
- Border top: `1px solid #e8eaed`
- Display: `flex`
- Justify content: `flex-end`

### Support Modal

**Support Info Container**:
- Display: `flex`, `column`
- Gap: `20px`
- Margin: `24px 0`

**Support Item**:
- Display: `flex`, `column`
- Gap: `8px`

**Support Label**:
- Font size: `14px`
- Font weight: `600`
- Color: `#64748b`
- Text transform: `uppercase`
- Letter spacing: `0.5px`

**Support Value**:
- Font size: `16px`
- Font weight: `500`
- Color: `#0a1929`
- Padding: `12px 16px`
- Background: `#f8f9fa`
- Border radius: `8px`
- Border: `2px solid #e8eaed`
- Transition: `all 0.3s ease`

**Support Value Hover**:
- Border color: `#d4af37`
- Background: `#fffbeb`

---

## Print Layouts

### Print Page Setup

**Page Settings**:
- Margin: `15mm 12mm`
- Size: `A4 portrait`

**Print-Only Classes**:
- Force all backgrounds and colors: `print-color-adjust: exact`
- Remove fixed positioning
- Set overflow to visible
- Remove max-heights
- Remove shadows on interactive elements

### Report Print Layout

**Page Break**:
- Page break after: `always`
- Height: `0`
- Margin/Padding: `0`
- Border: `none`

**Section Spacing**:
- Margin bottom: `8pt`
- Page break inside: `auto`

**Heading Spacing**:
- **H1**: Margin `0 6pt`
- **H2**: Margin `10pt 6pt`, avoid page break after
- **H3**: Margin `8pt 4pt`, avoid page break after
- **H4**: Margin `6pt 3pt`, avoid page break after

**Paragraph Spacing**:
- Margin: `0 4pt`
- Orphans: `2`
- Widows: `2`

**Table Spacing**:
- Margin: `4pt 6pt`
- Page break inside: `auto`

**List Spacing**:
- Margin: `2pt 4pt`
- List items: Margin bottom `2pt`

**Print Actions**:
- Display: `none !important` (hide all buttons and interactive elements)

---

## Responsive Design

### Breakpoints

- **Mobile**: `< 768px`
- **Tablet**: `768px - 1024px`
- **Desktop**: `> 1024px`

### Mobile Adjustments

**Grid Layouts**:
- Form grids: `1 column`
- Card grids: `1 column`
- Score grids: `1 column`

**Header**:
- Padding: `24px 16px`
- Flex direction: `column`
- Gap: `16px`

**Navigation**:
- Section nav: Full width, horizontal scroll
- Tab overflow: Scroll

**Typography**:
- H1: `28px`
- H2: `24px`
- H3: `20px`
- Body: `14px`

**Spacing**:
- Container padding: `16px`
- Card padding: `20px`
- Section padding: `24px`

**Tables**:
- Horizontal scroll
- Min width for cells

**Modals**:
- Width: `95%`
- Padding: `24px`

### Tablet Adjustments

**Grid Layouts**:
- Form grids: `2 columns` (optional)
- Card grids: `2 columns`

**Header**:
- Maintain desktop layout with smaller padding

**Typography**:
- Slightly reduce sizes
- Maintain readability

---

## Interactive States

### Hover States

**Buttons**:
- Transform: `translateY(-2px)`
- Increase shadow
- Slight color variation

**Cards**:
- Increase shadow
- Border color change

**Links**:
- Color change to gold
- Underline on hover

**Table Rows**:
- Background change to light gray

### Focus States

**Inputs/Textareas**:
- Border color: `#d4af37`
- Box shadow: `0 0 0 3px rgba(212, 175, 55, 0.3)`

**Buttons**:
- Outline: `none`
- Box shadow: `0 0 0 3px rgba(212, 175, 55, 0.3)`

### Active States

**Buttons**:
- Transform: `translateY(0)`
- Reduced shadow

**Response Buttons**:
- Background: `#d4af37`
- Color: `white`
- Border: Match background

### Disabled States

**All Interactive Elements**:
- Opacity: `0.6` or `0.4`
- Cursor: `not-allowed`
- No hover effects

---

## Accessibility Considerations

### Color Contrast

- All text meets WCAG AA standards
- Gold on white: `4.5:1` minimum
- Dark text on white: `7:1+`
- White on dark: `7:1+`

### Focus Indicators

- All interactive elements have visible focus states
- Focus ring uses brand color with transparency

### Semantic HTML

- Proper heading hierarchy
- Button vs link usage
- Form labels associated with inputs
- ARIA labels where needed

### Keyboard Navigation

- All interactive elements keyboard accessible
- Logical tab order
- Modal focus management

---

## Animation Guidelines

### Transition Timings

- **Fast**: `0.2s` - Small state changes
- **Normal**: `0.3s` - Standard interactions
- **Slow**: `0.5s` - Large movements

### Easing Functions

- **Default**: `ease` - Natural movement
- **In**: `ease-in` - Accelerating
- **Out**: `ease-out` - Decelerating
- **In-Out**: `ease-in-out` - Smooth start and end

### Transform Animations

- Prefer `transform` over position changes
- Use `translateY` for button hovers
- Scale for emphasis (subtle: 1.02-1.05)

---

## Component Patterns

### Card Pattern

- White background
- Border with brand color
- Rounded corners (8-12px)
- Subtle shadow
- Padding: 24-32px
- Hover state with enhanced shadow

### Button Pattern

**Primary**: Gold gradient, dark text
**Secondary**: White with gold border
**Danger**: Red background, white text
**Link**: Transparent with border

### Badge Pattern

- Small padding (4px 12px)
- Rounded (12px)
- Uppercase text
- Bold font
- Contextual colors

### Input Pattern

- Border: 2px solid gray
- Border radius: 8px
- Padding: 10-12px
- Focus: Gold border + shadow
- Background: Light gray or white

### Section Pattern

- White card container
- Border with brand color
- Header with title and actions
- Content area with proper spacing
- Separator lines using brand color

---

This comprehensive specification covers all pages, components, and design patterns used throughout the AML/CFT/CPF Risk Assessment System. All measurements, colors, and styles should be consistently applied across the application for a cohesive user experience.

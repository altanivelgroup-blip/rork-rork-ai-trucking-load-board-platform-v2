# CSV Bulk Upload Templates Guide

## The Problem You Identified
You're absolutely right! The old CSV template only had basic fields, so shippers still had to manually fill out lots of missing information after importing. This defeated the purpose of bulk upload.

## The Solution: Three Comprehensive Templates

### 1. **Complete Template (All Fields - 57 columns)**
**File: `loads_complete_template.csv`**

This template includes EVERY possible field for comprehensive load management. Perfect for shippers who want to capture every detail about their loads.

**Field Categories:**
- **Basic Load Information** (4 fields): title, description, loadType, reference
- **Origin Details** (8 fields): city, state, zip, address, company, contact, phone, email
- **Destination Details** (8 fields): city, state, zip, address, company, contact, phone, email
- **Scheduling** (7 fields): pickup date/time, delivery date/time, timezone, appointments, flexibility
- **Equipment & Cargo** (8 fields): vehicle type, weight, dimensions, pieces, commodity, hazmat, temperature, special equipment
- **Pricing** (7 fields): base rate, rate type, per-mile rate, distance, fuel surcharge, accessorials, total
- **Requirements & Instructions** (5 fields): special requirements, loading/delivery instructions, driver/insurance requirements
- **Contact & Documentation** (10 fields): primary/backup contacts, required documents (BOL, POD, signatures, photos)
- **Additional Information** (6 fields): notes, internal notes, customer reference, PO number, priority, expedited

**Sample Row:**
```csv
"Steel Coils - Chicago to Detroit","Heavy steel coils for automotive manufacturing","Steel/Metal","SC-2025-001","Chicago","IL","60601","1200 Industrial Blvd","Steel Works Inc","Mike Johnson","312-555-0101","mike@steelworks.com","Detroit","MI","48201","500 Auto Plant Rd","Motor City Manufacturing","Sarah Wilson","313-555-0202","sarah@motorcity.com","2025-09-15","08:00","2025-09-15","16:00","America/Chicago","Yes","No","Flatbed","45000","20x8x6","5","Steel Coils","No","Ambient","Tarps and chains required","2800","Flat Rate","9.33","300","150","Tarping: $75","3025","Crane required for loading/unloading","Use overhead crane at dock 3","Deliver to receiving dock B","CDL-A required, 2+ years experience","$1M cargo insurance minimum","Mike Johnson","312-555-0101","mike@steelworks.com","Tom Brown","312-555-0103","tom@steelworks.com","Yes","Yes","Yes","Yes","BOL, POD, Weight tickets","Handle with extreme care - high value cargo","Customer prefers morning deliveries","CUST-REF-789","PO-456123","High","No"
```

### 2. **Standard Template (Essential Fields - 25 columns)**
**File: `loads_canonical_template.csv`**

This template includes the most commonly used fields for standard load posting.

**Column Order:**
```
title,description,originCity,originState,originZip,originAddress,
destinationCity,destinationState,destinationZip,destinationAddress,
pickupDate,pickupTime,deliveryDate,deliveryTime,timeZone,
vehicleType,weight,rate,ratePerMile,distance,
specialRequirements,contactName,contactPhone,contactEmail,
loadType,dimensions,hazmat,temperature,notes
```

**Sample Data:**
```csv
"Dallas to Houston","Palletized goods","Dallas","TX","75201","123 Main St","Houston","TX","77001","456 Oak Ave","2025-09-10","09:00","2025-09-10","17:00","America/Chicago","Flatbed","12000","1400","4.83","290","Tarps required","John Smith","555-0123","john@company.com","Freight","48x40x60","No","N/A","Handle with care"
```

### 3. **Simple Template (Quick Start - 5 columns)**
**File: `loads_simple_template.csv`**

For shippers who want to start simple:

**Column Order:**
```
Origin,Destination,Vehicle Type,Weight,Price
```

**Sample Data:**
```csv
"Dallas, TX","Houston, TX","Car Hauler","5000","$1200"
"Las Vegas, NV","Phoenix, AZ","Box Truck","8000","$1600"
```

**Note:** Simple template auto-fills:
- Dates default to today at 09:00 (pickup) and 17:00 (delivery)
- Title auto-generates as "Origin → Destination — CSV"
- Description defaults to "Imported via CSV"

## What This Solves

### Before (Old System):
- Shipper uploads basic CSV with 9 fields
- Still has to manually enter: addresses, zip codes, contact info, special requirements, dimensions, etc.
- Takes forever to complete each load after import

### After (New System):
- **Complete Template**: Shipper fills out everything once in Excel/Google Sheets, imports, and loads are 100% complete
- **Standard Template**: Covers essential fields for most use cases
- **Simple Template**: Auto-fills missing fields with defaults, but still much faster than manual entry
- **Smart Column Mapping**: Accepts different column names (e.g., "Origin" = "originCity", "From" = "originCity")

## Supported File Formats

- **CSV** (.csv) - Comma-separated values
- **Excel** (.xlsx, .xls) - Export as CSV from Excel
- **Google Sheets** - Download as CSV

## Column Header Flexibility

The system accepts many different column header variations. For example, these all map to `originCity`:
- `origin`, `pickupcity`, `fromcity`, `origin_city`, `pickup city`, etc.

Column order doesn't matter - the system matches headers by name, not position.

## Date Formats Supported

- `YYYY-MM-DD HH:MM` (e.g., "2025-09-15 08:00")
- `YYYY-MM-DDTHH:MM` (ISO format)
- `M/D/YYYY H:MM` (e.g., "9/15/2025 8:00")
- `M/D/YY H:MM` (e.g., "9/15/25 8:00")
- `YYYY-MM-DD` (time defaults to 09:00 or 17:00)

## Vehicle Types Supported

- Car Hauler
- Box Truck
- Cargo Van
- Flatbed
- Reefer

## Benefits for Shippers

1. **Time Savings**: Complete loads in bulk instead of one-by-one
2. **Consistency**: Same format every time
3. **Flexibility**: Choose template that matches your needs
4. **Error Reduction**: Validation shows exactly what's wrong before import
5. **No Manual Work**: Loads are ready to publish immediately after import
6. **Professional Management**: Complete template enables full load lifecycle management

## How to Use

### For Google Sheets:
1. **Download Template**: Click "Complete Template" (recommended)
2. **Import to Google Sheets**: File → Import → Upload
3. **Fill Your Data**: Replace sample data with your loads
4. **Download as CSV**: File → Download → Comma-separated values (.csv)
5. **Upload to App**: Use CSV Import feature

### For Excel:
1. **Download Template**: Click "Complete Template" (recommended)
2. **Open in Excel**: Double-click the downloaded CSV
3. **Fill Your Data**: Replace sample data with your loads
4. **Save as CSV**: File → Save As → CSV (Comma delimited)
5. **Upload to App**: Use CSV Import feature

## Tips for Success

1. **Start with Complete Template** for full functionality
2. **Use Standard Template** if you don't need all fields
3. **Use Simple Template** only for quick testing
4. **Check your data** in the preview before importing
5. **Column headers are flexible** - use whatever naming makes sense
6. **Dates and times** should be in local timezone
7. **Remove empty rows** at the end of your CSV
8. **Use quotes** around text that contains commas

## Troubleshooting

**"Row invalid" errors:**
- Check required fields are filled
- Verify date formats
- Ensure vehicle type is supported
- Check that rate and weight are numbers

**Import fails:**
- Ensure you have Business membership
- Check file is valid CSV format
- Verify at least one row passes validation

**Missing data after import:**
- Use Complete Template for all fields
- Check column headers match expected names
- Review the preview before importing

The key insight is that shippers can now prepare everything in a spreadsheet (which they're comfortable with) rather than using the mobile app's multi-step wizard for each individual load.
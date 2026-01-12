# Report Storage Information

## Where PDF and PNG Files Are Stored

Generated report files (PDF and PNG) are stored in **Supabase Storage** in a bucket named `reports`.

### Storage Path Structure

Files are organized by **creation date** (when the snapshot was generated), not by the report month:

```
reports/
  {scope}/           # "admin" or "partner"
    {YYYY-MM-DD}/    # Creation date in format YYYY-MM-DD (e.g., "2026-01-15")
      {timestamp}-{hash}.pdf
      {timestamp}-{hash}.png
```

### Examples

**Admin Report created on 2026-01-15:**
- Path: `reports/admin/2026-01-15/1705068000000-abc123def456.pdf`
- Path: `reports/admin/2026-01-15/1705068000000-abc123def456.png`

**Partner Report created on 2026-01-15:**
- Path: `reports/partner/2026-01-15/1705068000000-xyz789ghi012.pdf`
- Path: `reports/partner/2026-01-15/1705068000000-xyz789ghi012.png`

### Benefits

- **Easy organization**: All reports created on the same day are grouped together
- **Simple cleanup**: Can easily delete old reports by date
- **Better structure**: No nested folders for venue IDs, cleaner hierarchy

### Access

- Files are stored as **private** in Supabase Storage
- Access is controlled through signed URLs with expiration
- Signed URLs are generated when viewing/downloading reports from the admin panel
- URLs expire after a set time (typically 1 hour)

### Database Records

Each generated report creates a record in the `ReportSnapshot` table with:
- `pdf_path`: Full path to the PDF file in storage
- `png_path`: Full path to the PNG thumbnail in storage
- `status`: "PENDING", "READY", or "FAILED"
- `job_id`: Unique identifier for tracking generation progress

### Viewing Reports

To view or download reports:
1. Go to Admin Panel → Reports → Snapshots tab
2. Find the report you want to view
3. Click "View" or "Download" button
4. A signed URL will be generated for secure access

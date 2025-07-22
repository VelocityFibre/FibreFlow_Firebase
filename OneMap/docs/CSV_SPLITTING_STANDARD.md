# CSV Splitting Standard for FibreFlow/OneMap

## Quick Reference

For the Lawley project (11.8M tokens / 14,579 rows):
- **Recommended**: 3,000 rows per file → 5 files
- **Result**: ~2.4M tokens per file (manageable for processing)

## Token Limits by Tool

### Claude (200K context)
- **Max context**: 200,000 tokens total
- **Practical limit**: 100,000 tokens per file (leaves room for analysis)
- **For Lawley**: Split into 146 files of 100 rows each

### Gemini (2M context) 
- **Max context**: 2,000,000 tokens
- **Can handle**: Full 11.8M file (but may be slow)
- **Recommended**: 3,000 rows per file for better performance

### GPT-4 (128K context)
- **Max context**: 128,000 tokens
- **Practical limit**: 60,000 tokens per file
- **For Lawley**: Would need ~200 files of 75 rows each

## Standard Approach

### 1. Token Estimation
```
Rough formula for wide CSVs (100+ columns):
- 1 row ≈ 800-1000 tokens
- Headers alone ≈ 1000-2000 tokens

For Lawley:
- 141 columns = ~1,500 tokens for headers
- Each row ≈ 810 tokens
- Total: 14,579 rows × 810 = 11.8M tokens
```

### 2. Recommended Splits by Use Case

| Use Case | Rows per Chunk | Tokens per Chunk | Best For |
|----------|----------------|------------------|----------|
| AI Analysis (Claude) | 100 | ~80K | Deep analysis, pattern finding |
| Processing (Scripts) | 3,000 | ~2.4M | Batch processing, aggregation |
| Human Review | 500 | ~400K | Manual inspection |
| Quick Preview | 50 | ~40K | Rapid testing |

### 3. Implementation Examples

```bash
# For Claude AI analysis (100 rows = ~80K tokens)
python3 split_large_csv.py Lawley_Project_Louis.csv rows 100
# Result: 146 files, each fits in Claude's context

# For batch processing (3,000 rows = ~2.4M tokens)
python3 split_large_csv.py Lawley_Project_Louis.csv rows 3000
# Result: 5 files, good for scripts

# By status (logical grouping)
python3 split_large_csv.py Lawley_Project_Louis.csv field Status
# Result: One file per status type
```

### 4. Processing Strategy

```python
# For AI analysis - process in chunks
async def analyze_with_ai(csv_file):
    # Split into AI-friendly chunks
    chunks = split_csv(csv_file, rows_per_chunk=100)
    
    results = []
    for chunk in chunks:
        # Each chunk fits in AI context
        analysis = await ai_analyze(chunk)
        results.append(analysis)
    
    # Merge results
    return merge_analyses(results)

# For duplicate detection across chunks
def find_duplicates_across_chunks(chunks):
    global_index = {}
    duplicates = []
    
    for chunk_num, chunk in enumerate(chunks):
        for row in chunk:
            key = row['Location Address']
            if key in global_index:
                duplicates.append({
                    'address': key,
                    'chunks': [global_index[key], chunk_num],
                    'property_ids': [...]
                })
            else:
                global_index[key] = chunk_num
    
    return duplicates
```

### 5. Metadata Structure

Each split generates `split_metadata.json`:
```json
{
  "original_file": "Lawley_Project_Louis.csv",
  "total_rows": 14579,
  "total_chunks": 146,
  "avg_tokens_per_chunk": 81000,
  "split_strategy": "rows",
  "chunks": [
    {
      "filename": "chunk_0000.csv",
      "rows": 100,
      "estimated_tokens": 81000
    }
  ]
}
```

## OneMap Integration Guidelines

### 1. Auto-Detection
```typescript
// Detect optimal split size based on file
function determineSplitSize(fileSize: number, columnCount: number): number {
  const estimatedTokensPerRow = columnCount * 8;
  const totalTokens = (fileSize / 100) * estimatedTokensPerRow;
  
  if (totalTokens < 100_000) return 0; // No split needed
  if (totalTokens < 1_000_000) return 1000; // 1K rows
  if (totalTokens < 10_000_000) return 3000; // 3K rows
  return 5000; // 5K rows max
}
```

### 2. Import Process
1. User uploads CSV
2. System estimates tokens
3. Auto-splits if needed
4. Processes chunks in parallel
5. Merges results
6. Shows unified view

### 3. Benefits
- **Performance**: Parallel processing
- **Reliability**: Failure isolation
- **Flexibility**: Different tools can process same data
- **Scalability**: Handle files of any size

## Summary

- **Claude**: 100 rows/chunk (146 files for Lawley)
- **Gemini**: 3,000 rows/chunk (5 files for Lawley)
- **Scripts**: 3,000-5,000 rows/chunk
- **Always**: Generate metadata for tracking

This standard ensures consistent, efficient handling of large CSV files across all FibreFlow/OneMap operations.
// Fetch and analyze the CSV file structure
async function analyzeCsvFile() {
  try {
    console.log("Fetching CSV file...")
    const response = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Master%20Material%20List%20HVV%20csv-NRFJJ9tiZI9fnsLCWMnWP8D1nWSdIl.csv",
    )
    const csvText = await response.text()

    console.log("CSV file fetched successfully")
    console.log("File size:", csvText.length, "characters")

    // Parse CSV manually to handle potential formatting issues
    const lines = csvText.split("\n").filter((line) => line.trim())
    console.log("Total lines:", lines.length)

    if (lines.length > 0) {
      console.log("\nFirst few lines:")
      lines.slice(0, 5).forEach((line, index) => {
        console.log(`Line ${index + 1}:`, line)
      })

      // Parse header
      const header = lines[0].split(",").map((col) => col.trim().replace(/"/g, ""))
      console.log("\nHeader columns:", header)

      // Parse first data row
      if (lines.length > 1) {
        const firstDataRow = lines[1].split(",").map((col) => col.trim().replace(/"/g, ""))
        console.log("\nFirst data row:", firstDataRow)

        // Create mapping
        console.log("\nColumn mapping:")
        header.forEach((col, index) => {
          console.log(`${col}: ${firstDataRow[index] || "N/A"}`)
        })
      }

      // Sample a few more rows
      console.log("\nSample data rows:")
      lines.slice(1, 6).forEach((line, index) => {
        const row = line.split(",").map((col) => col.trim().replace(/"/g, ""))
        console.log(`Row ${index + 2}:`, row)
      })
    }
  } catch (error) {
    console.error("Error analyzing CSV:", error)
  }
}

analyzeCsvFile()

// Fetch and analyze the CSV file to extract actual categories
async function analyzeCsvCategories() {
  try {
    console.log("Fetching CSV file to analyze categories...")
    const response = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Master%20Material%20List%20HVV%20csv-NRFJJ9tiZI9fnsLCWMnWP8D1nWSdIl.csv",
    )
    const csvText = await response.text()

    console.log("CSV file fetched successfully")

    // Parse CSV manually
    const lines = csvText.split("\n").filter((line) => line.trim())
    console.log("Total lines:", lines.length)

    if (lines.length > 0) {
      // Parse header to find category column
      const header = lines[0].split(",").map((col) => col.trim().replace(/"/g, ""))
      console.log("Header columns:", header)

      const categoryColumnIndex = header.findIndex(
        (col) => col.toLowerCase().includes("category") || col.toLowerCase().includes("item category"),
      )

      console.log("Category column index:", categoryColumnIndex)

      if (categoryColumnIndex !== -1) {
        // Extract all unique categories
        const categories = new Set()

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((col) => col.trim().replace(/"/g, ""))
          if (values[categoryColumnIndex] && values[categoryColumnIndex].trim()) {
            categories.add(values[categoryColumnIndex].trim())
          }
        }

        const uniqueCategories = Array.from(categories).sort()
        console.log("\nUnique categories found:")
        uniqueCategories.forEach((cat, index) => {
          console.log(`${index + 1}. ${cat}`)
        })

        console.log(`\nTotal unique categories: ${uniqueCategories.length}`)

        // Sample some items from each category
        console.log("\nSample items per category:")
        uniqueCategories.slice(0, 10).forEach((category) => {
          console.log(`\n--- ${category} ---`)
          let count = 0
          for (let i = 1; i < lines.length && count < 3; i++) {
            const values = lines[i].split(",").map((col) => col.trim().replace(/"/g, ""))
            if (values[categoryColumnIndex] === category) {
              const nameIndex = header.findIndex((col) => col.toLowerCase().includes("name"))
              const itemName = nameIndex !== -1 ? values[nameIndex] : values[0]
              console.log(`  - ${itemName}`)
              count++
            }
          }
        })

        return uniqueCategories
      }
    }
  } catch (error) {
    console.error("Error analyzing CSV categories:", error)
  }
}

analyzeCsvCategories()

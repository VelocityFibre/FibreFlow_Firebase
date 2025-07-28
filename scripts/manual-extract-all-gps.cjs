const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const REPORT_DIR = './reports';

// Manually extracted GPS data from viewing images
const extractedData = [
  // First 10 from previous manual extraction
  {
    fileName: 'LEFU9103.JPG',
    address: 'Piranha Crescent, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.396490,
    longitude: 27.813118,
    dateTime: '07/23/2025 11:22 AM GMT+02:00'
  },
  {
    fileName: 'UUZQ0214.JPG',
    address: 'Lawley Road, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.382613,
    longitude: 27.807202,
    dateTime: '07/24/2025 03:14 PM GMT+02:00'
  },
  {
    fileName: 'ARGS9536.JPG',
    address: '2nd Avenue, Lawley Extento, Lawley, Gauteng 1830, South Africa',
    latitude: -26.373870,
    longitude: 27.810132,
    dateTime: '07/23/2025 02:05 PM GMT+02:00'
  },
  {
    fileName: 'GBBN9148.JPG',
    address: 'Siyabonga Street, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.378948,
    longitude: 27.809967,
    dateTime: '07/23/2025 01:56 PM GMT+02:00'
  },
  {
    fileName: 'XHPT1307.JPG',
    address: '2nd Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.383169,
    longitude: 27.812837,
    dateTime: '07/23/2025 10:13 AM GMT+02:00'
  },
  {
    fileName: 'DMWX1009.JPG',
    address: 'Barracuda Road, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.390316,
    longitude: 27.810644,
    dateTime: '07/23/2025 11:02 AM GMT+02:00'
  },
  {
    fileName: 'PXFC6466.JPG',
    address: '2nd Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.384564,
    longitude: 27.806597,
    dateTime: '07/24/2025 03:04 PM GMT+02:00'
  },
  {
    fileName: 'CKCL1172.JPG',
    address: 'Ramalepe Street, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.384188,
    longitude: 27.806924,
    dateTime: '07/24/2025 03:11 PM GMT+02:00'
  },
  {
    fileName: 'HRHV1719.JPG',
    address: '5th Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.382739,
    longitude: 27.805834,
    dateTime: '07/24/2025 03:35 PM GMT+02:00'
  },
  {
    fileName: 'RQBM3981.JPG',
    address: '13 Enoch Street, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.380007,
    longitude: 27.808841,
    dateTime: '07/23/2025 02:15 PM GMT+02:00'
  },
  // New extractions
  {
    fileName: 'ABOW5086.JPG',
    address: 'Barracuda Road, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.389451,
    longitude: 27.807816,
    dateTime: '07/23/2025 10:57 AM GMT+02:00'
  },
  {
    fileName: 'AEJD0192.JPG',
    address: '3rd Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.387176,
    longitude: 27.806611,
    dateTime: '07/23/2025 10:26 AM GMT+02:00'
  }
];

// Get all file names
const allFileNames = [
  'ABKU4865.JPG', 'ABOW5086.JPG', 'AEJD0192.JPG', 'AFKK3290.JPG', 'AGJO0968.JPG',
  'ALDT8478.JPG', 'ANGT3574.JPG', 'AQXY9444.JPG', 'ARDJ2862.JPG', 'ARGS9536.JPG',
  'ARZV1695.JPG', 'ASFR5899.JPG', 'AVQE2541.JPG', 'AXWD8963.JPG', 'BAHM3423.JPG',
  'BBFL7303.JPG', 'BBNO8820.JPG', 'BIZJ8490.JPG', 'BMCZ3397.JPG', 'BMES8191.JPG',
  'BNZL9622.JPG', 'BOTI0083.JPG', 'BRMQ8573.JPG', 'BSAC1151.JPG', 'BSVV3015.JPG',
  'BVXT8184.JPG', 'BWHK1080.JPG', 'BYZJ7377.JPG', 'CCHC6189.JPG', 'CFEZ4826.JPG',
  'CHXX4480.JPG', 'CIFN6820.JPG', 'CKCL1172.JPG', 'CMFB6989.JPG', 'CNPR3546.JPG',
  'CPIY3449.JPG', 'CRCM2517.JPG', 'CURY0142.JPG', 'CUZE5708.JPG', 'CVYD6786.JPG',
  'CWVA8617.JPG', 'DIVV9861.JPG', 'DLED9593.JPG', 'DMWX1009.JPG', 'DSSJ8820.JPG',
  'DWIS9846.JPG', 'DXGS2451.JPG', 'ECAT6148.JPG', 'EGVZ5387.JPG', 'EJGI5277.JPG',
  'EJOW5275.JPG', 'EKVB0045.JPG', 'ELEF5957.JPG', 'ELGT6458.JPG', 'EOCV4425.JPG',
  'EOIZ5717.JPG', 'ETTC0277.JPG', 'EWBU1563.JPG', 'EWPN3355.JPG', 'EYVK8258.JPG',
  'FCRK6534.JPG', 'FEDH2359.JPG', 'FGYH9883.JPG', 'FKAS6112.JPG', 'FOBP7095.JPG',
  'FPRN8261.JPG', 'FPUA8230.JPG', 'FQHP7703.JPG', 'FRZT7746.JPG', 'FSIE6113.JPG',
  'FUUK5806.JPG', 'FVNM8623.JPG', 'FWNA8701.JPG', 'FZCN1104.JPG', 'GBBN9148.JPG',
  'GDJF1059.JPG', 'GFXE6104.JPG', 'GHOQ0380.JPG', 'GPLX1215.JPG', 'GTVE5972.JPG',
  'GUFJ6642.JPG', 'GVSQ9506.JPG', 'GXLF7888.JPG', 'GXPW1294.JPG', 'GYRT1650.JPG',
  'GZAZ0002.JPG', 'GZZE1257.JPG', 'HEBR8966.JPG', 'HFJW0466.JPG', 'HJTK6524.JPG',
  'HNWT8378.JPG', 'HRHV1719.JPG', 'HXDI7619.JPG', 'IHDN2384.JPG', 'IKNO0666.JPG',
  'INYM6657.JPG', 'ITSN6013.JPG', 'IWTO6731.JPG', 'IXQJ4199.JPG', 'JBCX2606.JPG',
  'JFMR0303.JPG', 'JHBL4173.JPG', 'JICW4677.JPG', 'JIFA6525.JPG', 'JKBX4547.JPG',
  'JMGZ5849.JPG', 'JOHX8627.JPG', 'JORC3951.JPG', 'JOXT4885.JPG', 'JQAP0618.JPG',
  'JRBO4719.JPG', 'JRES8871.JPG', 'JRJK0074.JPG', 'JTDL8318.JPG', 'JUTQ2605.JPG',
  'KBFG9863.JPG', 'KBJL5416.JPG', 'KCNR7774.JPG', 'KFAG2719.JPG', 'KFPC4033.JPG',
  'KHXE4166.JPG', 'KPPR4041.JPG', 'KSLO7547.JPG', 'KTRN8339.JPG', 'KTRZ9107.JPG',
  'KUJV1094.JPG', 'KXNH1740.JPG', 'KZJG1774.JPG', 'LAIT5665.JPG', 'LAOI2088.JPG',
  'LAUZ9813.JPG', 'LCAA3476.JPG', 'LCPN6936.JPG', 'LDVG2848.JPG', 'LEFU9103.JPG',
  'LGEK4848.JPG', 'LHXN9576.JPG', 'LJOK8305.JPG', 'LJWO4036.JPG', 'LKCO8361.JPG',
  'LLJV1719.JPG', 'LLYH5166.JPG', 'LNFJ1362.JPG', 'LNUF3952.JPG', 'LORQ7337.JPG',
  'LRJS8723.JPG', 'LUGB2444.JPG', 'LVQS7719.JPG', 'LZMD6695.JPG', 'MEOY2576.JPG',
  'MHVE8681.JPG', 'MIHO6036.JPG', 'MITJ8514.JPG', 'MKPF8039.JPG', 'MMSV5273.JPG',
  'MNQG8362.JPG', 'MNYP0514.JPG', 'MPLA1520.JPG', 'MPLP6039.JPG', 'MQKV3530.JPG',
  'MTKL1685.JPG', 'MUPB9447.JPG', 'MYFJ4833.JPG', 'MZNQ5821.JPG', 'NBAP8668.JPG',
  'NDXC1328.JPG', 'NHZW0821.JPG', 'NJOI9127.JPG', 'NKSR0571.JPG', 'NKWG1103.JPG',
  'NPQM8530.JPG', 'NQRV6326.JPG', 'NRIH6438.JPG', 'NRLG8531.JPG', 'NTIE7033.JPG',
  'NWLG6313.JPG', 'NWMR0749.JPG', 'NYJO1308.JPG', 'NZCB5613.JPG', 'OCBS9373.JPG',
  'ODND8736.JPG', 'ODWC0090.JPG', 'OEAH5618.JPG', 'OEBI3834.JPG', 'OLQR7875.JPG',
  'ONHR8259.JPG', 'OQME9639.JPG', 'OSEG0763.JPG', 'OTQD9838.JPG', 'OXDW8491.JPG',
  'OZXU2615.JPG', 'PBAM8802.JPG', 'PCFN7486.JPG', 'PCUC0627.JPG', 'PEPE9831.JPG',
  'PGCF9468.JPG', 'PGCV4444.JPG', 'PIBP1507.JPG', 'PLRF4639.JPG', 'PMNA6651.JPG',
  'PMRB1485.JPG', 'POPM1636.JPG', 'PPBN0325.JPG', 'PPNO2972.JPG', 'PRBU0329.JPG',
  'PSQY8436.JPG', 'PXFC6466.JPG', 'PYQN5343.JPG', 'QDHP9454.JPG', 'QEMX6173.JPG',
  'QEYO6451.JPG', 'QFBI0536.JPG', 'QGQW6325.JPG', 'QHJM5322.JPG', 'QISB6021.JPG',
  'QJTL3972.JPG', 'QPNU3323.JPG', 'QRVR5538.JPG', 'QSJK9547.JPG', 'QTWN6652.JPG',
  'QUBF3025.JPG', 'QUEF8227.JPG', 'QWAQ0973.JPG', 'QXMW5588.JPG', 'QYEX8313.JPG',
  'RANQ2421.JPG', 'RBDR1618.JPG', 'RBME2613.JPG', 'RCFV2055.JPG', 'RDUR8368.JPG',
  'REUZ6322.JPG', 'RGVS8431.JPG', 'RIPS1350.JPG', 'RKQK9913.JPG', 'RLRM6338.JPG',
  'RMWI0729.JPG', 'RNFJ1063.JPG', 'RORW7026.JPG', 'RQBM3981.JPG', 'RRBU4373.JPG',
  'RRVZ4173.JPG', 'RTLP0314.JPG', 'RVUP3831.JPG', 'RYPS9931.JPG', 'SATI5739.JPG',
  'SBDL9139.JPG', 'SCJH9451.JPG', 'SFBN5016.JPG', 'SFQG5322.JPG', 'SGZE6472.JPG',
  'SHEZ6439.JPG', 'SJBV8316.JPG', 'SJPC4833.JPG', 'SLPP5614.JPG', 'SOXC2672.JPG',
  'SRMV1633.JPG', 'STFG3263.JPG', 'SUMS0614.JPG', 'SVGX1327.JPG', 'SWUW6227.JPG',
  'SZMD3227.JPG', 'SZUP6213.JPG', 'TBLQ6530.JPG', 'TEPZ6516.JPG', 'TFSN1636.JPG',
  'THEZ5306.JPG', 'TNKE1606.JPG', 'TQFP8414.JPG', 'TSEM1617.JPG', 'TSMN3637.JPG',
  'TUXT4622.JPG', 'TVDA8406.JPG', 'TVMU1036.JPG', 'TVNS5616.JPG', 'TWAK5022.JPG',
  'TYIS0931.JPG', 'UABV0622.JPG', 'UBTB4022.JPG', 'UFXG5216.JPG', 'UJGZ0822.JPG',
  'UNSJ6225.JPG', 'UPLB0633.JPG', 'UPLJ0418.JPG', 'UQQG1506.JPG', 'UQUZ5427.JPG',
  'UUZQ0214.JPG', 'UXNS5018.JPG', 'UYZA0925.JPG', 'VADY3016.JPG', 'VAGO4422.JPG',
  'VAUO6318.JPG', 'VBFG1823.JPG', 'VGNP6823.JPG', 'VJEB8230.JPG', 'VJYR3517.JPG',
  'VLFP1423.JPG', 'VOEA3027.JPG', 'VQEA3923.JPG', 'VSVS6418.JPG', 'VXLM5031.JPG',
  'VYEY5616.JPG', 'VYKO1425.JPG', 'VYVI8725.JPG', 'VZNG2419.JPG', 'WAJO8427.JPG',
  'WCZN1525.JPG', 'WGRV6920.JPG', 'WHRD9825.JPG', 'WIXU8430.JPG', 'WJUZ1018.JPG',
  'WKXJ5228.JPG', 'WMFQ4917.JPG', 'WMLY5320.JPG', 'WPNJ8622.JPG', 'WVGA0522.JPG',
  'WXYX8617.JPG', 'XCVR5316.JPG', 'XFEQ6622.JPG', 'XHPT1307.JPG', 'XKIF9030.JPG',
  'XLOM3420.JPG', 'XNAX9318.JPG', 'XQGL6520.JPG', 'XRSG3030.JPG', 'XSUA9927.JPG',
  'XTPP8217.JPG', 'XVHQ2227.JPG', 'XWJF7322.JPG', 'XZBE3830.JPG', 'XZCM8622.JPG',
  'YADZ8522.JPG', 'YCDM5023.JPG', 'YCRG2822.JPG', 'YESZ5233.JPG', 'YHEN1323.JPG',
  'YHNB5422.JPG', 'YIAL6817.JPG', 'YITF5030.JPG', 'YJLK5420.JPG', 'YKDR8119.JPG',
  'YLIR6431.JPG', 'YNYX0320.JPG', 'YQAE8728.JPG', 'YQCS3818.JPG', 'YRRT1533.JPG',
  'YSOZ6023.JPG', 'YTPH3223.JPG', 'YUBT6530.JPG', 'YUSG5633.JPG', 'YWHN8729.JPG',
  'YWZI3130.JPG', 'YYJU4817.JPG', 'YZJG1027.JPG', 'YZKS2618.JPG', 'ZCQW3233.JPG',
  'ZDKG9530.JPG', 'ZDLY0123.JPG', 'ZDUK4917.JPG', 'ZEAU8730.JPG', 'ZFXK2820.JPG',
  'ZGAR6220.JPG', 'ZMCF6617.JPG', 'ZPYX9022.JPG', 'ZTAA9023.JPG', 'ZTNC8118.JPG',
  'ZTXE6725.JPG', 'ZUTY6922.JPG', 'ZUWG2822.JPG', 'ZVVH9625.JPG', 'ZXRE1527.JPG'
];

async function createCompleteReport() {
  console.log('📍 CREATING COMPLETE GPS REPORT WITH EXTRACTED DATA\n');
  
  try {
    await fs.mkdir(REPORT_DIR, { recursive: true });
    
    const allData = [];
    
    // Create a map for quick lookup
    const extractedMap = new Map();
    extractedData.forEach(d => extractedMap.set(d.fileName, d));
    
    // Process all files
    allFileNames.forEach((fileName, index) => {
      if (extractedMap.has(fileName)) {
        // Use extracted data
        const data = extractedMap.get(fileName);
        allData.push({
          index: index + 1,
          fileName: fileName,
          poleId: `ETT-${String(index + 1).padStart(4, '0')}`,
          location: 'Lawley, Gauteng, South Africa',
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          coordinates: `${data.latitude}, ${data.longitude}`,
          dateTime: data.dateTime,
          capturedBy: 'GPS Map Camera',
          uploadedBy: 'ettienejvr@gmail.com',
          status: 'Extracted'
        });
      } else {
        // Mark as pending extraction
        allData.push({
          index: index + 1,
          fileName: fileName,
          poleId: `ETT-${String(index + 1).padStart(4, '0')}`,
          location: 'Lawley, Gauteng, South Africa',
          address: 'Pending manual extraction',
          latitude: '',
          longitude: '',
          coordinates: '',
          dateTime: '',
          capturedBy: 'GPS Map Camera',
          uploadedBy: 'ettienejvr@gmail.com',
          status: 'Pending'
        });
      }
    });
    
    // Create CSV
    const csvPath = path.join(REPORT_DIR, 'ettiene-all-gps-data.csv');
    const csvWriter = createCsvWriter({
      path: csvPath,
      header: [
        { id: 'index', title: 'No.' },
        { id: 'fileName', title: 'File Name' },
        { id: 'poleId', title: 'Pole ID' },
        { id: 'location', title: 'Location' },
        { id: 'address', title: 'Full Address' },
        { id: 'latitude', title: 'Latitude' },
        { id: 'longitude', title: 'Longitude' },
        { id: 'coordinates', title: 'GPS Coordinates' },
        { id: 'dateTime', title: 'Date/Time' },
        { id: 'status', title: 'Status' }
      ]
    });
    
    await csvWriter.writeRecords(allData);
    console.log(`✅ CSV created: ${csvPath}`);
    
    // Create Excel
    const workbook = new ExcelJS.Workbook();
    
    // Main data sheet
    const dataSheet = workbook.addWorksheet('All GPS Data');
    dataSheet.columns = [
      { header: 'No.', key: 'index', width: 8 },
      { header: 'File Name', key: 'fileName', width: 20 },
      { header: 'Pole ID', key: 'poleId', width: 12 },
      { header: 'Address', key: 'address', width: 60 },
      { header: 'Latitude', key: 'latitude', width: 12 },
      { header: 'Longitude', key: 'longitude', width: 12 },
      { header: 'Coordinates', key: 'coordinates', width: 25 },
      { header: 'Date/Time', key: 'dateTime', width: 25 },
      { header: 'Status', key: 'status', width: 12 }
    ];
    
    // Style header
    dataSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    dataSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF003399' }
    };
    
    // Add data with conditional formatting
    allData.forEach(row => {
      const excelRow = dataSheet.addRow(row);
      if (row.status === 'Extracted') {
        excelRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFCCFFCC' }
        };
      }
    });
    
    // Extracted only sheet
    const extractedSheet = workbook.addWorksheet('Extracted GPS Data');
    extractedSheet.columns = dataSheet.columns;
    extractedSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    extractedSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF00AA00' }
    };
    
    const extractedRows = allData.filter(d => d.status === 'Extracted');
    extractedRows.forEach(row => {
      extractedSheet.addRow(row);
    });
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Information', key: 'info', width: 40 },
      { header: 'Details', key: 'details', width: 60 }
    ];
    
    summarySheet.addRows([
      { info: 'Report Date', details: new Date().toLocaleString() },
      { info: 'Total Images', details: allFileNames.length },
      { info: 'GPS Data Extracted', details: extractedRows.length },
      { info: 'Pending Extraction', details: allFileNames.length - extractedRows.length },
      { info: 'Extraction Progress', details: `${(extractedRows.length/allFileNames.length*100).toFixed(1)}%` },
      { info: '', details: '' },
      { info: 'EXTRACTED LOCATIONS', details: '' },
      ...extractedRows.map(d => ({
        info: d.fileName,
        details: `${d.address.split(',')[0]} (${d.coordinates})`
      })),
      { info: '', details: '' },
      { info: 'DATA SOURCE', details: 'GPS Map Camera overlay on photos' },
      { info: 'Extraction Method', details: 'Manual viewing and extraction' },
      { info: 'Uploaded By', details: 'ettienejvr@gmail.com' },
      { info: 'Processing Date', details: new Date().toISOString() }
    ]);
    
    summarySheet.getRow(1).font = { bold: true };
    
    // Save Excel
    const excelPath = path.join(REPORT_DIR, 'ettiene-all-gps-data.xlsx');
    await workbook.xlsx.writeFile(excelPath);
    console.log(`✅ Excel created: ${excelPath}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 GPS DATA EXTRACTION REPORT');
    console.log('='.repeat(60));
    console.log(`✅ Total images: ${allFileNames.length}`);
    console.log(`📍 GPS extracted: ${extractedRows.length} (${(extractedRows.length/allFileNames.length*100).toFixed(1)}%)`);
    console.log(`⏳ Pending extraction: ${allFileNames.length - extractedRows.length}`);
    console.log('\n📍 Extracted GPS locations:');
    extractedRows.forEach(d => {
      console.log(`   ${d.fileName}: ${d.coordinates} - ${d.address.split(',')[0]}`);
    });
    console.log('\n💡 To extract remaining GPS data, view each image manually');
    console.log('   and add to the extractedData array in this script.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createCompleteReport();
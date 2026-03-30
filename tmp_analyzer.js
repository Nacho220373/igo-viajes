import * as XLSX from 'xlsx';
import fs from 'fs';

function analyzeFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }
    const buf = fs.readFileSync(filePath);
    const workbook = XLSX.read(buf, {type: 'buffer'});
    const result = {};
    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const headers = [];
        if (!sheet['!ref']) {
            result[sheetName] = headers;
            continue;
        }
        const range = XLSX.utils.decode_range(sheet['!ref']);
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell = sheet[XLSX.utils.encode_cell({c: C, r: range.s.r})];
            if (cell !== undefined && cell.v !== undefined) {
                headers.push(cell.v.toString().trim());
            } else {
                headers.push("");
            }
        }
        result[sheetName] = headers;
    }
    return result;
}

const backend = analyzeFile('Backend_IGO.xlsx');
const template = analyzeFile('IGO_Plantilla_Masiva.xlsx');

fs.writeFileSync('tmp_output.json', JSON.stringify({ backend, template }, null, 2));

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';

interface VehicleRow {
  licensePlate: string;
  vin: string;
  modelName: string;
  yearMfg: number;
  branchCode: string;
  currentOdo?: number;
}

@Injectable()
export class VehicleImportService {
  constructor(private prisma: PrismaService) {}

  // Đọc giá trị ô Excel thành text (xử lý cả ô công thức/rich-text mà ExcelJS trả về object)
  private cellText(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      // ô công thức { result } hoặc rich text { richText: [...] } hoặc hyperlink { text }
      if ('result' in value) return String(value.result ?? '').trim();
      if ('text' in value) return String(value.text ?? '').trim();
      if ('richText' in value) return value.richText.map((r: any) => r.text).join('').trim();
    }
    return String(value).trim();
  }

  // Đọc giá trị ô Excel thành số (bỏ dấu phẩy phân cách, xử lý ô công thức)
  private cellNumber(value: any): number {
    const text = this.cellText(value).replace(/,/g, '');
    const n = Number(text);
    return isNaN(n) ? 0 : n;
  }

  async importFromExcel(buffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new BadRequestException('File Excel không có sheet nào');

    const rows: VehicleRow[] = [];
    const errors: string[] = [];

    // Expected headers: Biển số | VIN | Model | Năm SX | Chi nhánh | ODO
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      const licensePlate = String(row.getCell(1).value || '').trim();
      const vin = String(row.getCell(2).value || '').trim();
      const modelName = String(row.getCell(3).value || '').trim();
      const yearMfg = Number(row.getCell(4).value) || 0;
      const branchCode = String(row.getCell(5).value || '').trim();
      const currentOdo = Number(row.getCell(6).value) || 0;

      if (!licensePlate) return; // skip empty rows

      if (!vin) errors.push(`Dòng ${rowNumber}: thiếu VIN`);
      if (!modelName) errors.push(`Dòng ${rowNumber}: thiếu Model`);
      if (!yearMfg || yearMfg < 2000) errors.push(`Dòng ${rowNumber}: năm SX không hợp lệ`);
      if (!branchCode) errors.push(`Dòng ${rowNumber}: thiếu mã chi nhánh`);

      // Biển số phải đúng định dạng có dấu chấm, vd: 68A-123.32
      const PLATE_REGEX = /^\d{2,3}[A-Z]{1,2}-\d{3}\.\d{2}$/;
      if (licensePlate && !PLATE_REGEX.test(licensePlate)) {
        errors.push(`Dòng ${rowNumber}: biển số "${licensePlate}" sai định dạng (vd: 68A-123.32, phải có dấu chấm)`);
      }

      rows.push({ licensePlate, vin, modelName, yearMfg, branchCode, currentOdo });
    });

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'File có lỗi dữ liệu',
        errors: errors.slice(0, 20),
      });
    }

    if (rows.length === 0) {
      throw new BadRequestException('File không có dữ liệu xe nào');
    }

    // Validate references
    const models = await this.prisma.vehicleModel.findMany();
    const branches = await this.prisma.branch.findMany();

    const modelMap = new Map(models.map((m) => [m.name.toLowerCase(), m.id]));
    const branchMap = new Map(branches.map((b) => [b.code.toUpperCase(), b.id]));

    const created: any[] = [];
    const skipped: string[] = [];

    for (const row of rows) {
      const modelId = modelMap.get(row.modelName.toLowerCase());
      if (!modelId) {
        skipped.push(`${row.licensePlate}: model "${row.modelName}" không tồn tại`);
        continue;
      }

      const branchId = branchMap.get(row.branchCode.toUpperCase());
      if (!branchId) {
        skipped.push(`${row.licensePlate}: chi nhánh "${row.branchCode}" không tồn tại`);
        continue;
      }

      // Check duplicates
      const existing = await this.prisma.vehicle.findFirst({
        where: { OR: [{ licensePlate: row.licensePlate }, { vin: row.vin }] },
      });

      if (existing) {
        skipped.push(`${row.licensePlate}: đã tồn tại (trùng biển số hoặc VIN)`);
        continue;
      }

      const vehicle = await this.prisma.vehicle.create({
        data: {
          licensePlate: row.licensePlate,
          vin: row.vin,
          modelId,
          yearMfg: row.yearMfg,
          branchId,
          currentOdo: row.currentOdo || 0,
        },
        include: { model: true, branch: true },
      });

      created.push(vehicle);
    }

    return {
      total: rows.length,
      created: created.length,
      skipped: skipped.length,
      skippedDetails: skipped,
      vehicles: created,
    };
  }

  async getTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Import Xe');

    sheet.columns = [
      { header: 'Biển số', key: 'licensePlate', width: 15 },
      { header: 'VIN', key: 'vin', width: 20 },
      { header: 'Model', key: 'modelName', width: 15 },
      { header: 'Năm SX', key: 'yearMfg', width: 10 },
      { header: 'Mã CN', key: 'branchCode', width: 10 },
      { header: 'ODO', key: 'currentOdo', width: 10 },
    ];

    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };

    // Sample row
    sheet.addRow({
      licensePlate: '30A-12345',
      vin: 'VF8E34A12345678',
      modelName: 'VF e34',
      yearMfg: 2024,
      branchCode: 'HN01',
      currentOdo: 15000,
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // Import Excel để CẬP NHẬT ODO cho xe đã tồn tại (không thêm xe mới)
  async importOdoFromExcel(buffer: Buffer, userId: string) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new BadRequestException('File Excel không có sheet nào');

    // Cột: Biển số | VIN | ODO mới
    const rows: { key: string; odo: number; rowNumber: number }[] = [];
    const errors: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // bỏ header

      const vin = this.cellText(row.getCell(1).value);
      const licensePlate = this.cellText(row.getCell(2).value);
      const odo = this.cellNumber(row.getCell(3).value);

      if (!vin && !licensePlate) return; // bỏ dòng trống

      if (!odo || odo <= 0) {
        errors.push(`Dòng ${rowNumber}: ODO không hợp lệ`);
        return;
      }

      // Ưu tiên khớp theo VIN (chính xác hơn biển số)
      rows.push({ key: vin || licensePlate, odo, rowNumber });
    });

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'File có lỗi dữ liệu',
        errors: errors.slice(0, 20),
      });
    }

    if (rows.length === 0) {
      throw new BadRequestException('File không có dữ liệu ODO nào');
    }

    let updated = 0;
    const skipped: string[] = [];

    for (const row of rows) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { OR: [{ licensePlate: row.key }, { vin: row.key }] },
      });

      if (!vehicle) {
        skipped.push(`${row.key}: không tìm thấy xe`);
        continue;
      }

      if (row.odo <= vehicle.currentOdo) {
        skipped.push(`${row.key}: ODO mới (${row.odo}) không lớn hơn ODO hiện tại (${vehicle.currentOdo})`);
        continue;
      }

      const delta = row.odo - vehicle.currentOdo;
      await this.prisma.$transaction([
        this.prisma.vehicleOdoLog.create({
          data: {
            vehicleId: vehicle.id,
            odo: row.odo,
            previousOdo: vehicle.currentOdo,
            delta,
            source: 'excel',
            userId,
          },
        }),
        this.prisma.vehicle.update({
          where: { id: vehicle.id },
          data: { currentOdo: row.odo },
        }),
      ]);

      updated++;
    }

    return {
      total: rows.length,
      updated,
      skipped: skipped.length,
      skippedDetails: skipped,
    };
  }

  async getOdoTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Cập nhật ODO');

    sheet.columns = [
      { header: 'VIN', key: 'vin', width: 22 },
      { header: 'Biển số', key: 'licensePlate', width: 15 },
      { header: 'ODO mới', key: 'odo', width: 12 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };

    // Có thể điền VIN (ưu tiên) hoặc biển số
    sheet.addRow({ vin: 'VF8E34A12345678', licensePlate: '', odo: 25000 });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

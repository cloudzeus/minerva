"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import ExcelJS from "exceljs";

/**
 * Export all device telemetry data to Excel
 * SECURITY: Accessible by ADMIN, MANAGER, EMPLOYEE
 */
export async function exportTelemetryToExcel() {
  // Allow all authenticated users to export telemetry
  const currentUser = await requireRole(Role.EMPLOYEE);

  try {
    // Fetch all telemetry data with device information
    const telemetryData = await prisma.milesightDeviceTelemetry.findMany({
      orderBy: { dataTimestamp: "desc" },
      take: 10000, // Limit to last 10,000 records
    });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = currentUser.name || currentUser.email || "System";
    workbook.created = new Date();

    // Create worksheet
    const worksheet = workbook.addWorksheet("Device Telemetry");

    // Define columns
    worksheet.columns = [
      { header: "Device ID", key: "deviceId", width: 25 },
      { header: "Device Name", key: "deviceName", width: 20 },
      { header: "Device SN", key: "deviceSn", width: 20 },
      { header: "Device Model", key: "deviceModel", width: 15 },
      { header: "Event ID", key: "eventId", width: 30 },
      { header: "Event Type", key: "eventType", width: 15 },
      { header: "Data Type", key: "dataType", width: 15 },
      { header: "Timestamp", key: "timestamp", width: 20 },
      { header: "Temperature (°C)", key: "temperature", width: 18 },
      { header: "Temp Left (°C)", key: "temperatureLeft", width: 18 },
      { header: "Temp Right (°C)", key: "temperatureRight", width: 18 },
      { header: "Humidity (%)", key: "humidity", width: 15 },
      { header: "Battery (%)", key: "battery", width: 15 },
      { header: "Additional Data", key: "additionalData", width: 30 },
      { header: "Created At", key: "createdAt", width: 20 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    // Add data rows
    telemetryData.forEach((record) => {
      const sensorData = record.sensorData
        ? JSON.parse(record.sensorData)
        : {};

      worksheet.addRow({
        deviceId: record.deviceId,
        deviceName: record.deviceName || "—",
        deviceSn: record.deviceSn || "—",
        deviceModel: record.deviceModel || "—",
        eventId: record.eventId,
        eventType: record.eventType,
        dataType: record.dataType,
        timestamp: new Date(Number(record.dataTimestamp)),
        temperature: record.temperature,
        temperatureLeft: sensorData.temperature_left || "—",
        temperatureRight: sensorData.temperature_right || "—",
        humidity: record.humidity,
        battery: record.battery,
        additionalData: JSON.stringify(sensorData),
        createdAt: record.createdAt,
      });
    });

    // Auto-filter
    worksheet.autoFilter = {
      from: "A1",
      to: `O1`,
    };

    // Freeze header row
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Convert to base64 for client download
    const base64 = Buffer.from(buffer).toString("base64");

    return {
      success: true,
      data: base64,
      filename: `device-telemetry-${new Date().toISOString().split("T")[0]}.xlsx`,
      recordCount: telemetryData.length,
    };
  } catch (error: any) {
    console.error("[Telemetry Export] Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Export telemetry data for a specific device
 */
export async function exportDeviceTelemetry(deviceId: string) {
  await requireRole(Role.EMPLOYEE);

  try {
    const [telemetryData, device] = await Promise.all([
      prisma.milesightDeviceTelemetry.findMany({
        where: { deviceId },
        orderBy: { dataTimestamp: "desc" },
        take: 5000,
      }),
      prisma.milesightDeviceCache.findUnique({
        where: { deviceId },
      }),
    ]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(
      device?.name || `Device ${deviceId}`
    );

    worksheet.columns = [
      { header: "Timestamp", key: "timestamp", width: 20 },
      { header: "Event Type", key: "eventType", width: 15 },
      { header: "Temperature (°C)", key: "temperature", width: 18 },
      { header: "Temp Left (°C)", key: "temperatureLeft", width: 18 },
      { header: "Temp Right (°C)", key: "temperatureRight", width: 18 },
      { header: "Humidity (%)", key: "humidity", width: 15 },
      { header: "Battery (%)", key: "battery", width: 15 },
      { header: "Additional Data", key: "additionalData", width: 30 },
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    telemetryData.forEach((record) => {
      const sensorData = record.sensorData
        ? JSON.parse(record.sensorData)
        : {};

      worksheet.addRow({
        timestamp: new Date(Number(record.dataTimestamp)),
        eventType: record.eventType,
        temperature: record.temperature,
        temperatureLeft: sensorData.temperature_left || "—",
        temperatureRight: sensorData.temperature_right || "—",
        humidity: record.humidity,
        battery: record.battery,
        additionalData: JSON.stringify(sensorData),
      });
    });

    worksheet.autoFilter = { from: "A1", to: "H1" };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return {
      success: true,
      data: base64,
      filename: `${device?.name || deviceId}-telemetry-${new Date().toISOString().split("T")[0]}.xlsx`,
      recordCount: telemetryData.length,
    };
  } catch (error: any) {
    console.error("[Device Telemetry Export] Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}


import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, generateToken } from "@/lib/auth-utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fullName,
      rollNumber,
      email,
      mobile,
      collegeName,
      department,
      yearOfStudy,
      section,
      password,
    } = body;

    if (
      !fullName ||
      !rollNumber ||
      !email ||
      !mobile ||
      !collegeName ||
      !department ||
      !yearOfStudy ||
      !section ||
      !password
    ) {
      return NextResponse.json(
        { status: "error", message: "All fields are required" },
        { status: 400 }
      );
    }

    const existingRoll = await db.student.findUnique({
      where: { roll: rollNumber.toUpperCase() },
    });

    if (existingRoll) {
      return NextResponse.json(
        {
          status: "error",
          message: "Student with this roll number already exists",
        },
        { status: 400 }
      );
    }

    const existingEmail = await db.student.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingEmail) {
      return NextResponse.json(
        {
          status: "error",
          message: "Student with this email already exists",
        },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(password);
    const yearString = `${yearOfStudy}rd Year`; // E.g. "3rd Year"

    const student = await db.student.create({
      data: {
        name: fullName,
        roll: rollNumber.toUpperCase(),
        email: email.toLowerCase(),
        mobile,
        collegeName,
        dept: department,
        year: yearString,
        section: section.toUpperCase(),
        password: passwordHash,
        status: "Active",
        lastLogin: new Date().toISOString().slice(0, 16).replace("T", " "),
      },
    });

    const token = generateToken({
      id: student.id,
      roll: student.roll,
      role: "Student",
    });

    // Extract real client IP from request headers
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const clientIp = forwarded ? forwarded.split(",")[0].trim() : (realIp || "127.0.0.1");

    return NextResponse.json({
      status: "success",
      token,
      profile: {
        roll: student.roll,
        name: student.name,
        email: student.email,
        dept: student.dept === "CSE" ? "Computer Science" : student.dept,
        year: student.year,
        section: student.section,
        ip: clientIp,
        collegeName: student.collegeName,
      },
    });
  } catch (error: any) {
    console.error("Student registration error:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 }
    );
  }
}

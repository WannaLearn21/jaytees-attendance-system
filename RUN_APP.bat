@echo off
title Jaytees Employee Attendance & Monitoring Web App
echo ===================================================
echo Starting Jaytees Attendance App on localhost:3000...
echo ===================================================
start "" "http://localhost:3000"
call npm.cmd run dev
pause

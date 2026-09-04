#!/usr/bin/env node

/**
 * Schedule Data Checker & Random Course Inserter
 *
 * Usage:
 *   node scripts/check-and-insert-course.js [--data-file <path>]
 *
 * This script:
 *   1. Validates the stored schedule data for corruption
 *   2. Inserts a random course into the default schedule (index 0)
 *
 * The data file simulates the @system.storage key-value store used by the Quick App.
 * Default data file: storage-data.json in the project root.
 */

var fs = require('fs')
var path = require('path')

var VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
var COURSE_NAMES = [
  'Mathematics', 'English', 'Physics', 'Chemistry', 'Biology',
  'History', 'Geography', 'Computer Science', 'Art & Design', 'Music',
  'Physical Education', 'Literature', 'Philosophy', 'Economics', 'Psychology'
]
var TEACHERS = [
  'Dr. Smith', 'Prof. Johnson', 'Dr. Williams', 'Dr. Miller', 'Dr. Taylor',
  'Dr. Brown', 'Prof. Davis', 'Prof. Anderson', 'Coach Wilson', 'Prof. Martinez',
  'Dr. Lee', 'Prof. White', 'Dr. Clark', 'Prof. Hall', 'Dr. Moore'
]
var LOCATIONS = [
  'Room 101', 'Room 102', 'Room 201', 'Room 205', 'Room 301',
  'Lab A', 'Lab B', 'Lab C', 'Computer Lab 1', 'Computer Lab 2',
  'Gymnasium', 'Music Room', 'Art Studio', 'Library', 'Auditorium'
]
var TIME_SLOTS = [
  '08:00 - 08:45', '08:55 - 09:40', '10:00 - 10:45', '10:55 - 11:40',
  '13:00 - 13:45', '13:55 - 14:40', '15:00 - 15:45', '15:55 - 16:40',
  '17:00 - 17:45', '18:00 - 18:45'
]

var NOTES = [
  'Chapter 1: Introduction', 'Chapter 2: Fundamentals', 'Chapter 3: Advanced Topics',
  'Review session', 'Quiz preparation', 'Group project', 'Lab exercise',
  'Practice problems', 'Reading assignment', 'Final exam review'
]

var DATA_FILE = path.join(__dirname, '..', 'storage-data.json')
var DEFAULT_SCHEDULE_INDEX = '0'
var STORAGE_KEY = 'allCourses'

function parseArgs() {
  var args = process.argv.slice(2)
  for (var i = 0; i < args.length; i++) {
    if (args[i] === '--data-file' && i + 1 < args.length) {
      DATA_FILE = path.resolve(args[i + 1])
      i++
    }
  }
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function padZero(n) {
  return n < 10 ? '0' + n : String(n)
}

function generateRandomTime() {
  return randomItem(TIME_SLOTS)
}

function generateCourseId(existingIds) {
  var maxId = 0
  for (var i = 0; i < existingIds.length; i++) {
    var num = parseInt(existingIds[i], 10)
    if (!isNaN(num) && num > maxId) {
      maxId = num
    }
  }
  return String(maxId + 1)
}

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    return null
  }
  try {
    var raw = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch (e) {
    console.error('[ERROR] Failed to read or parse data file: ' + e.message)
    return null
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
    console.log('[OK] Data saved to: ' + DATA_FILE)
    return true
  } catch (e) {
    console.error('[ERROR] Failed to write data file: ' + e.message)
    return false
  }
}

function getScheduleData(data) {
  if (!data) return null
  var key = STORAGE_KEY + '_' + DEFAULT_SCHEDULE_INDEX
  var raw = data[key]
  if (!raw) return null
  try {
    if (typeof raw === 'string') {
      return JSON.parse(raw)
    }
    return raw
  } catch (e) {
    console.error('[ERROR] Failed to parse schedule data for key "' + key + '": ' + e.message)
    return null
  }
}

function setScheduleData(data, schedule) {
  var key = STORAGE_KEY + '_' + DEFAULT_SCHEDULE_INDEX
  data[key] = JSON.stringify(schedule)
}

function validateTimeFormat(time) {
  if (typeof time !== 'string') return false
  var pattern = /^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/
  return pattern.test(time)
}

function validateSchedule(schedule) {
  var errors = []
  var warnings = []
  var allIds = []

  if (!Array.isArray(schedule)) {
    errors.push('Schedule is not an array')
    return { errors: errors, warnings: warnings, valid: false }
  }

  if (schedule.length === 0) {
    warnings.push('Schedule is empty (no days with courses)')
    return { errors: errors, warnings: warnings, valid: true }
  }

  var seenDays = {}

  for (var d = 0; d < schedule.length; d++) {
    var dayEntry = schedule[d]
    var dayLabel = 'schedule[' + d + ']'

    if (typeof dayEntry !== 'object' || dayEntry === null) {
      errors.push(dayLabel + ': not a valid object')
      continue
    }

    if (typeof dayEntry.day !== 'string' || dayEntry.day.trim() === '') {
      errors.push(dayLabel + ': missing or invalid "day" field')
    } else if (VALID_DAYS.indexOf(dayEntry.day) === -1) {
      errors.push(dayLabel + ': unknown day "' + dayEntry.day + '". Valid days: ' + VALID_DAYS.join(', '))
    }

    if (seenDays[dayEntry.day]) {
      warnings.push(dayLabel + ': duplicate day "' + dayEntry.day + '"')
    }
    seenDays[dayEntry.day] = true

    if (!Array.isArray(dayEntry.classes)) {
      errors.push(dayLabel + ': "classes" is not an array')
      continue
    }

    if (dayEntry.classes.length === 0) {
      warnings.push(dayLabel + ' (' + dayEntry.day + '): no classes on this day')
    }

    for (var c = 0; c < dayEntry.classes.length; c++) {
      var course = dayEntry.classes[c]
      var courseLabel = dayLabel + '.classes[' + c + ']'

      if (typeof course !== 'object' || course === null) {
        errors.push(courseLabel + ': not a valid object')
        continue
      }

      if (!course.id || typeof course.id !== 'string') {
        errors.push(courseLabel + ': missing or invalid "id"')
      } else {
        if (allIds.indexOf(course.id) !== -1) {
          errors.push(courseLabel + ': duplicate id "' + course.id + '"')
        } else {
          allIds.push(course.id)
        }
      }

      if (!course.name || typeof course.name !== 'string') {
        errors.push(courseLabel + ': missing or invalid "name"')
      }

      if (!course.time || !validateTimeFormat(course.time)) {
        errors.push(courseLabel + ': missing or invalid "time" (expected format: HH:MM - HH:MM)')
      }

      if (!course.teacher || typeof course.teacher !== 'string') {
        errors.push(courseLabel + ': missing or invalid "teacher"')
      }

      if (course.location === undefined || course.location === null || typeof course.location !== 'string') {
        errors.push(courseLabel + ': missing or invalid "location"')
      }

      if (course.notes !== undefined && course.notes !== null && typeof course.notes !== 'string') {
        warnings.push(courseLabel + ': "notes" should be a string')
      }
    }
  }

  return {
    errors: errors,
    warnings: warnings,
    valid: errors.length === 0,
    totalDays: schedule.length,
    totalCourses: allIds.length
  }
}

function checkData() {
  console.log('========================================')
  console.log('  Schedule Data Integrity Check')
  console.log('========================================')
  console.log('Data file: ' + DATA_FILE)
  console.log('')

  var data = readData()

  if (!data) {
    console.log('[INFO] No existing data file found. Will create a new one.')
    data = {}
  }

  console.log('Storage keys found: ' + Object.keys(data).length)
  for (var key in data) {
    if (data.hasOwnProperty(key)) {
      var val = data[key]
      var preview = typeof val === 'string' ? val.substring(0, 80) + '...' : JSON.stringify(val)
      console.log('  - ' + key + ': ' + preview)
    }
  }
  console.log('')

  var schedule = getScheduleData(data)

  if (!schedule) {
    console.log('[WARN] No schedule data found for key "' + STORAGE_KEY + '_' + DEFAULT_SCHEDULE_INDEX + '".')
    console.log('[INFO] Initializing with default schedule from schedule.json...')
    var defaultSchedule = require('../src/data/schedule.json')
    schedule = defaultSchedule.schedule
    setScheduleData(data, schedule)
    if (!writeData(data)) {
      process.exit(1)
    }
    console.log('')
  }

  console.log('--- Validating Schedule ---')
  var result = validateSchedule(schedule)

  if (result.errors.length > 0) {
    console.log('\n[ERRORS] Found ' + result.errors.length + ' error(s):')
    for (var i = 0; i < result.errors.length; i++) {
      console.log('  ✗ ' + result.errors[i])
    }
  }

  if (result.warnings.length > 0) {
    console.log('\n[WARNINGS] Found ' + result.warnings.length + ' warning(s):')
    for (var j = 0; j < result.warnings.length; j++) {
      console.log('  ⚠ ' + result.warnings[j])
    }
  }

  console.log('')
  console.log('--- Summary ---')
  console.log('  Days:     ' + result.totalDays)
  console.log('  Courses:  ' + result.totalCourses)
  console.log('  Status:   ' + (result.valid ? 'VALID' : 'CORRUPTED'))

  if (result.errors.length > 0) {
    console.log('')
    console.log('[RESULT] DATA IS CORRUPTED! ' + result.errors.length + ' error(s) found.')
    return { data: data, schedule: schedule, valid: false, result: result }
  }

  console.log('[RESULT] Data is healthy.')
  return { data: data, schedule: schedule, valid: true, result: result }
}

function insertRandomCourse(data, schedule) {
  console.log('')
  console.log('========================================')
  console.log('  Insert Random Course')
  console.log('========================================')

  var allIds = []
  for (var d = 0; d < schedule.length; d++) {
    var classes = schedule[d].classes
    for (var c = 0; c < classes.length; c++) {
      allIds.push(classes[c].id)
    }
  }

  var newId = generateCourseId(allIds)
  var newName = randomItem(COURSE_NAMES)
  var newTime = generateRandomTime()
  var newTeacher = randomItem(TEACHERS)
  var newLocation = randomItem(LOCATIONS)
  var newNotes = randomItem(NOTES)
  var targetDay = randomItem(VALID_DAYS)

  var newCourse = {
    id: newId,
    name: newName,
    time: newTime,
    teacher: newTeacher,
    location: newLocation,
    notes: newNotes
  }

  console.log('New course:')
  console.log('  ID:       ' + newCourse.id)
  console.log('  Name:     ' + newCourse.name)
  console.log('  Time:     ' + newCourse.time)
  console.log('  Teacher:  ' + newCourse.teacher)
  console.log('  Location: ' + newCourse.location)
  console.log('  Notes:    ' + newCourse.notes)
  console.log('  Target:   ' + targetDay)

  var dayEntry = null
  for (var i = 0; i < schedule.length; i++) {
    if (schedule[i].day === targetDay) {
      dayEntry = schedule[i]
      break
    }
  }

  if (!dayEntry) {
    dayEntry = { day: targetDay, classes: [] }
    schedule.push(dayEntry)
    console.log('  Action:   Created new day entry for ' + targetDay)
  }

  dayEntry.classes.push(newCourse)
  console.log('  Action:   Added course to ' + targetDay + ' (now ' + dayEntry.classes.length + ' courses)')

  setScheduleData(data, schedule)
  var saved = writeData(data)

  if (saved) {
    var totalCourses = 0
    for (var j = 0; j < schedule.length; j++) {
      totalCourses += schedule[j].classes.length
    }
    console.log('')
    console.log('[OK] Random course inserted successfully!')
    console.log('     Total courses now: ' + totalCourses)
  }

  return saved
}

function main() {
  parseArgs()

  var checkResult = checkData()

  if (!checkResult.valid) {
    console.log('')
    console.log('[SKIP] Course insertion skipped due to data corruption.')
    console.log('       Please fix the errors above before inserting new courses.')
    process.exit(1)
  }

  insertRandomCourse(checkResult.data, checkResult.schedule)
  console.log('')
}

main()
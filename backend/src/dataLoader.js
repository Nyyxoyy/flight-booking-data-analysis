const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

function loadCsv(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function loadData() {
  try {
    const airlineFile = path.join(__dirname, '..', 'data', 'Airline ID to Name.csv');
    const bookingsFile = path.join(__dirname, '..', 'data', 'Flight Bookings.csv');

    if (!fs.existsSync(airlineFile)) throw new Error('Airline mapping file not found');
    if (!fs.existsSync(bookingsFile)) throw new Error('Bookings data file not found');

    // Load airline mapping
    const airlines = await loadCsv(airlineFile);
    const airlineMap = {};
    airlines.forEach((row) => {
      airlineMap[row.airlie_id] = row.airline_name;
    });

    // Load and process bookings
    const rawBookings = await loadCsv(bookingsFile);
    const processedBookings = rawBookings.map(booking => {
      const airlineId = booking.airlie_id;
      return {
        // Original fields
        airlie_id: airlineId,
        flght: booking.flght,
        departure_dt: booking.departure_dt,
        arrival_dt: booking.arrival_dt,
        dep_time: booking.dep_time,
        arrivl_time: booking.arrivl_time,
        booking_cd: booking.booking_cd,
        passngr_nm: booking.passngr_nm,
        seat_no: booking.seat_no,
        class: booking.class,
        fare: parseFloat(booking.fare) || 0,
        extras: booking.extras,
        loyalty_pts: parseInt(booking.loyalty_pts) || 0,
        status: booking.status,
        gate: booking.gate,
        terminal: booking.terminal,
        baggage_claim: booking.baggage_claim,
        duration_hrs: parseFloat(booking.duration_hrs) || 0,
        layovers: parseInt(booking.layovers) || 0,
        layover_locations: booking.layover_locations,
        aircraft_type: booking.aircraft_type,
        pilot: booking.pilot,
        cabin_crew: booking.cabin_crew,
        inflight_ent: booking.inflight_ent,
        meal_option: booking.meal_option,
        wifi: booking.wifi === 'true',
        window_seat: booking.window_seat === 'true',
        aisle_seat: booking.aisle_seat === 'true',
        emergency_exit_row: booking.emergency_exit_row === 'true',
        number_of_stops: parseInt(booking.number_of_stops) || 0,
        reward_program_member: booking.reward_program_member === 'true',
        
        // Derived fields
        AirlineName: airlineMap[airlineId] || `Unknown (ID: ${airlineId})`,
        BookingDate: new Date(booking.departure_dt),
        FlightDelay: calculateDelay(booking.dep_time, booking.arrivl_time, booking.duration_hrs)
      };
    });

    return { 
      bookings: processedBookings, 
      airlines: airlineMap,
      allColumns: Object.keys(rawBookings[0] || {}) 
    };
  } catch (error) {
    console.error('Error loading data:', error);
    throw error;
  }
}

function calculateDelay(depTime, arrTime, scheduledDuration) {
  // Implement your delay calculation logic here
  // This is a placeholder - adjust based on your actual data format
  return 0; // Return delay in minutes
}

module.exports = { loadData };
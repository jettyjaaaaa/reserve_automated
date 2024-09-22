const puppeteer = require('puppeteer');
const fs = require('fs'); // Import the File System module

const users = [
    { id: 'your ID', password: 'Password' }
];
// const courts = ['R07C01', 'R07C02']; // Court names for testing
const courts = ['R11C01', 'R11C02', //'R11C03',
                'R12C01', 'R12C02', //'R12C03',
                'R13C01', 'R13C02'] //'R13C03'];

// Mapping courts to their respective times
const courtTimes = {
    R07: '13.00-14.00',
    R08: '14.00-15.00',
    R09: '15.00-16.00',
    R10: '16.00-17.00',
    R11: '17.00-18.00',
    R12: '18.00-19.00',
    R13: '19.00-20.00'
};

// To track which courts were reserved for each time slot
const reservedCourts = {
    '13.00-14.00': [],
    '14.00-15.00': [],
    '15.00-16.00': [],
    '16.00-17.00': [],
    '17.00-18.00': [],
    '18.00-19.00': [],
    '19.00-20.00': []
};

async function reserveCourtForUser(user, courts) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    let reservedCourt = null; // Store the reserved court

    try {
        // Log in as the user
        await page.goto('https://website.com');
        await page.type('#uname', user.id);
        await page.type('#pwd', user.password);
        await page.click('#btnLogin');
        await page.waitForNavigation();

        // Set up the dialog handler
        page.on('dialog', async dialog => {
            const message = dialog.message();
            console.log(`Dialog for user ${user.id}: ${message}`);

            // Check if the dialog indicates that the court is unavailable
            if (message.includes('unavailable') || message.includes('already reserved')) {
                console.log(`Court unavailable for user ${user.id}. Moving to next court...`);
            }

            // Accept the dialog (press OK)
            await dialog.accept();
        });

        // Try to reserve one court (checking availability)
        for (const court of courts) {
            try {
                console.log(`User ${user.id} trying to reserve court ${court}`);

                // Click on the court based on the court value
                const courtSelector = `input[type="image"][value="${court}"]`;
                await page.click(courtSelector);

                // Wait for a short time to see if a dialog appears
                await page.waitForTimeout(3000);

                // If no error (alert) appeared, assume the reservation succeeded
                reservedCourt = court;
                console.log(`User ${user.id} successfully reserved court ${court}`);
                break; // Stop after successfully reserving one court
            } catch (error) {
                console.log(`Error reserving court ${court} for user ${user.id}:`, error);
            }
        }
    } catch (err) {
        console.error(`Error for user ${user.id}:`, err);
    } finally {
        if (reservedCourt) {
            // Extract court number and time from the reserved court
            const courtPrefix = reservedCourt.slice(0, 3); // e.g., R07, R12, etc.
            const courtNumber = reservedCourt.slice(-2); // e.g., 01, 02, etc.
            const reservedTime = courtTimes[courtPrefix]; // Get time from courtTimes mapping

            // Debug log to check if court is reserved correctly
            console.log(`Court Prefix: ${courtPrefix}, Time: ${reservedTime}, Court Number: ${courtNumber}`);

            const result = `User ${user.id} reserved ${reservedTime} Court ${courtNumber}\n`;

            // Add court to reservedCourts summary
            reservedCourts[reservedTime].push(courtNumber);

            // Write result to a text file
            fs.appendFileSync('reservation_results.txt', result);
        } else {
            const result = `User ${user.id} could not reserve any court.\n`;
            fs.appendFileSync('reservation_results.txt', result);
        }
        await browser.close(); // Close browser after reservation
    }
}

// Run reservations for all users in parallel
(async () => {
    const reservationPromises = users.map(user => reserveCourtForUser(user, courts));
    await Promise.all(reservationPromises); // Reserve courts in parallel

    // Write the summary of reserved courts
    let summary = '\nSummary of reserved courts by time:\n';
    for (const time in reservedCourts) {
        const courtsReserved = reservedCourts[time].length > 0 ? reservedCourts[time].join(', ') : 'None';
        summary += `${time}: Court ${courtsReserved}\n`;
    }
    fs.appendFileSync('reservation_results.txt', summary); // Append summary to the results file

    // Debug log of final summary for verification
    console.log('Final Summary:\n', summary);
})();

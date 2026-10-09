const puppeteer = require('puppeteer-core');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const fs = require('fs');

const browserPath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

const RESOLUTIONS = [
  // Mobile Portrait
  { name: 'Mobile 320x568', width: 320, height: 568, device: 'mobile', orientation: 'portrait' },
  { name: 'Mobile 360x640', width: 360, height: 640, device: 'mobile', orientation: 'portrait' },
  { name: 'Mobile 375x667', width: 375, height: 667, device: 'mobile', orientation: 'portrait' },
  { name: 'Mobile 390x844', width: 390, height: 844, device: 'mobile', orientation: 'portrait' },
  { name: 'Mobile 393x852', width: 393, height: 852, device: 'mobile', orientation: 'portrait' },
  { name: 'Mobile 412x915', width: 412, height: 915, device: 'mobile', orientation: 'portrait' },
  { name: 'Mobile 430x932', width: 430, height: 932, device: 'mobile', orientation: 'portrait' },
  { name: 'Mobile 480x800', width: 480, height: 800, device: 'mobile', orientation: 'portrait' },

  // Mobile Landscape
  { name: 'Mobile Land 568x320', width: 568, height: 320, device: 'mobile', orientation: 'landscape' },
  { name: 'Mobile Land 640x360', width: 640, height: 360, device: 'mobile', orientation: 'landscape' },
  { name: 'Mobile Land 667x375', width: 667, height: 375, device: 'mobile', orientation: 'landscape' },
  { name: 'Mobile Land 844x390', width: 844, height: 390, device: 'mobile', orientation: 'landscape' },
  { name: 'Mobile Land 852x393', width: 852, height: 393, device: 'mobile', orientation: 'landscape' },
  { name: 'Mobile Land 915x412', width: 915, height: 412, device: 'mobile', orientation: 'landscape' },
  { name: 'Mobile Land 932x430', width: 932, height: 430, device: 'mobile', orientation: 'landscape' },
  { name: 'Mobile Land 800x480', width: 800, height: 480, device: 'mobile', orientation: 'landscape' },

  // Tablet Portrait
  { name: 'Tablet 600x800', width: 600, height: 800, device: 'tablet', orientation: 'portrait' },
  { name: 'Tablet 768x1024', width: 768, height: 1024, device: 'tablet', orientation: 'portrait' },
  { name: 'Tablet 800x1280', width: 800, height: 1280, device: 'tablet', orientation: 'portrait' },
  { name: 'Tablet 810x1080', width: 810, height: 1080, device: 'tablet', orientation: 'portrait' },
  { name: 'Tablet 820x1180', width: 820, height: 1180, device: 'tablet', orientation: 'portrait' },
  { name: 'Tablet 834x1194', width: 834, height: 1194, device: 'tablet', orientation: 'portrait' },
  { name: 'Tablet 1024x1366', width: 1024, height: 1366, device: 'tablet', orientation: 'portrait' },

  // Tablet Landscape
  { name: 'Tablet Land 800x600', width: 800, height: 600, device: 'tablet', orientation: 'landscape' },
  { name: 'Tablet Land 1024x768', width: 1024, height: 768, device: 'tablet', orientation: 'landscape' },
  { name: 'Tablet Land 1280x800', width: 1280, height: 800, device: 'tablet', orientation: 'landscape' },
  { name: 'Tablet Land 1080x810', width: 1080, height: 810, device: 'tablet', orientation: 'landscape' },
  { name: 'Tablet Land 1180x820', width: 1180, height: 820, device: 'tablet', orientation: 'landscape' },
  { name: 'Tablet Land 1194x834', width: 1194, height: 834, device: 'tablet', orientation: 'landscape' },
  { name: 'Tablet Land 1366x1024', width: 1366, height: 1024, device: 'tablet', orientation: 'landscape' },

  // Laptop
  { name: 'Laptop 1280x720', width: 1280, height: 720, device: 'laptop', orientation: 'landscape' },
  { name: 'Laptop 1366x768', width: 1366, height: 768, device: 'laptop', orientation: 'landscape' },
  { name: 'Laptop 1440x900', width: 1440, height: 900, device: 'laptop', orientation: 'landscape' },
  { name: 'Laptop 1536x864', width: 1536, height: 864, device: 'laptop', orientation: 'landscape' },
  { name: 'Laptop 1600x900', width: 1600, height: 900, device: 'laptop', orientation: 'landscape' },

  // Desktop
  { name: 'Desktop 1920x1080', width: 1920, height: 1080, device: 'desktop', orientation: 'landscape' },
  { name: 'Desktop 1920x1200', width: 1920, height: 1200, device: 'desktop', orientation: 'landscape' },
  { name: 'Desktop 2560x1440 (2K)', width: 2560, height: 1440, device: 'desktop', orientation: 'landscape' },
  { name: 'Desktop 2560x1600', width: 2560, height: 1600, device: 'desktop', orientation: 'landscape' },
  { name: 'Desktop 3840x2160 (4K)', width: 3840, height: 2160, device: 'desktop', orientation: 'landscape' },

  // Intermediate / Custom Widths
  { name: 'Custom 340x700', width: 340, height: 700, device: 'mobile', orientation: 'portrait' },
  { name: 'Custom 500x800', width: 500, height: 800, device: 'mobile', orientation: 'portrait' },
  { name: 'Custom 700x900', width: 700, height: 900, device: 'tablet', orientation: 'portrait' },
  { name: 'Custom 900x1000', width: 900, height: 1000, device: 'tablet', orientation: 'portrait' },
  { name: 'Custom 1100x800', width: 1100, height: 800, device: 'laptop', orientation: 'landscape' },
  { name: 'Custom 1700x900', width: 1700, height: 900, device: 'desktop', orientation: 'landscape' }
];

const PAGES = [
  { name: 'Book Ride', path: '/passenger/book' },
  { name: 'Advance Bookings', path: '/passenger/prebook' },
  { name: 'Outside Trips', path: '/passenger/outside' },
  { name: 'Ride History', path: '/passenger/rides' },
  { name: 'Passenger Profile', path: '/passenger/profile' }
];

async function runAudit() {
  console.log(`Starting Responsive UI Audit using browser: ${browserPath}`);
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();

  // 1. Authenticate passenger session with real registered user
  const regEmail = `audit.passenger.${Date.now()}@pondiuni.ac.in`;
  const regPhone = '98' + Math.floor(10000000 + Math.random() * 90000000);
  
  let realToken = null;
  let realUser = null;

  try {
    const regRes = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Priyanka Sharma',
        email: regEmail,
        phone: regPhone,
        password: 'Password123!',
        role: 'CUSTOMER'
      })
    });
    const regData = await regRes.json();
    realToken = regData.data?.accessToken;
    realUser = regData.data?.user;
    console.log('✅ Real passenger registered:', realUser?.email, 'Token:', realToken ? 'OK' : 'MISSING');
  } catch (err) {
    console.error('Failed to register test passenger:', err.message);
  }

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await page.evaluate((tok, usr) => {
    localStorage.setItem('papido_user_token', tok);
    localStorage.setItem('papido_user', JSON.stringify(usr));
  }, realToken, realUser);
  console.log('✅ Injected real passenger credentials into session');

  await page.goto('http://localhost:5173/passenger/book', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  const isShell = await page.evaluate(() => Boolean(document.querySelector('.passenger-shell')));
  console.log('✅ Passenger shell mounted:', isShell);

  const issuesFound = [];
  let testsCount = 0;
  let passCount = 0;

  for (const pageConfig of PAGES) {
    console.log(`\n--- Auditing Page: ${pageConfig.name} (${pageConfig.path}) ---`);
    await page.goto(`http://localhost:5173${pageConfig.path}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 800));

    for (const res of RESOLUTIONS) {
      testsCount++;
      await page.setViewport({
        width: res.width,
        height: res.height,
        deviceScaleFactor: 1,
        isMobile: res.device === 'mobile' || res.device === 'tablet',
        hasTouch: res.device === 'mobile' || res.device === 'tablet'
      });
      await new Promise(r => setTimeout(r, 150));

      const audit = await page.evaluate((targetWidth) => {
        const root = document.documentElement;
        const body = document.body;
        const shell = document.querySelector('.passenger-shell');

        const scrollWidth = Math.max(root.scrollWidth, body.scrollWidth, shell ? shell.scrollWidth : 0);
        const hasHScroll = scrollWidth > (targetWidth + 1);

        // Check if navigation is visible (either header .ps-nav or bottom .papido-bottom-nav)
        const headerNav = document.querySelector('.ps-nav');
        const headerNavVisible = headerNav && window.getComputedStyle(headerNav).display !== 'none';

        const bottomNav = document.querySelector('.papido-bottom-nav');
        const bottomNavVisible = bottomNav && window.getComputedStyle(bottomNav).display !== 'none';

        const hasNav = headerNavVisible || bottomNavVisible;

        // Check for any overflowing elements
        const overflowingElements = [];
        const allElements = document.querySelectorAll('.passenger-shell *');
        for (const el of allElements) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            if (rect.right > (targetWidth + 2)) {
              // Check if element is visually clipped by an ancestor with overflow hidden/auto/scroll
              let isClipped = false;
              let parent = el.parentElement;
              while (parent && parent !== document.body && parent !== root) {
                const style = window.getComputedStyle(parent);
                if (
                  ['hidden', 'auto', 'scroll'].includes(style.overflow) ||
                  ['hidden', 'auto', 'scroll'].includes(style.overflowX) ||
                  (style.contain && (style.contain.includes('paint') || style.contain.includes('strict')))
                ) {
                  const pRect = parent.getBoundingClientRect();
                  if (pRect.right <= (targetWidth + 2)) {
                    isClipped = true;
                    break;
                  }
                }
                parent = parent.parentElement;
              }

              if (!isClipped) {
                const tag = el.tagName.toLowerCase();
                const cls = (el.className || '').toString().slice(0, 50);
                overflowingElements.push({ tag, cls, right: Math.round(rect.right), width: Math.round(rect.width) });
                if (overflowingElements.length >= 3) break;
              }
            }
          }
        }

        // Check if main content is clipped or card width is 0
        const mainContainer = document.querySelector('.ps-main');
        const mainRect = mainContainer ? mainContainer.getBoundingClientRect() : null;

        return {
          targetWidth,
          scrollWidth,
          hasHScroll,
          hasNav,
          headerNavVisible,
          bottomNavVisible,
          overflowCount: overflowingElements.length,
          overflowSample: overflowingElements,
          mainWidth: mainRect ? Math.round(mainRect.width) : 0
        };
      }, res.width);

      let issue = null;
      if (audit.hasHScroll) {
        issue = `Horizontal scroll detected: scrollWidth ${audit.scrollWidth}px > viewport ${res.width}px. Overflow elements: ${JSON.stringify(audit.overflowSample)}`;
      } else if (!audit.hasNav) {
        issue = `No navigation visible! Neither header nav nor bottom nav is displayed on ${res.device} (${res.width}px).`;
      } else if (audit.overflowCount > 0) {
        issue = `Elements clipping outside viewport (${res.width}px): ${JSON.stringify(audit.overflowSample)}`;
      }

      if (issue) {
        console.log(`❌ [${res.name}] ${pageConfig.name}: ${issue}`);
        issuesFound.push({ page: pageConfig.name, resolution: res.name, width: res.width, height: res.height, issue });
      } else {
        passCount++;
      }
    }
  }

  await browser.close();

  console.log(`\n================ AUDIT SUMMARY ================`);
  console.log(`Total Viewport Tests: ${testsCount}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Issues Found: ${issuesFound.length}`);
  if (issuesFound.length > 0) {
    console.log('\n--- DETAILED ISSUES ---');
    issuesFound.forEach((iss, i) => {
      console.log(`${i + 1}. [${iss.resolution}] ${iss.page}: ${iss.issue}`);
    });
  }
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});

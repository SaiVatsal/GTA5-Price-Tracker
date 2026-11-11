/**
 * GTA V & Steam Price Tracker - Automated Telegram Notifier
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'price_state.json');

// Configuration (via Environment Variables or Defaults)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '9132532819:AAEaKW4r4ejgqQgN4Ac_1brb2IfpmuhB0Ik';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '7986634426';
const COUNTRY_CODE = process.env.STEAM_COUNTRY || 'in'; // 'in' for India (INR ₹), 'us' for USD ($)

// Tracked Game: GTA V Enhanced / Premium Edition (AppID 3240220 / 271590)
const TRACKED_GAMES = [
  {
    appId: 3240220,
    name: 'Grand Theft Auto V',
    fallbackUrl: 'https://store.steampowered.com/app/3240220'
  }
];

async function fetchGamePrice(appId, country) {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=${country}&filters=price_overview,basic`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from Steam Store API`);
    }

    const json = await res.json();
    const appData = json[appId.toString()];

    if (!appData || !appData.success || !appData.data) {
      throw new Error(`Invalid response for AppID ${appId}`);
    }

    const price = appData.data.price_overview;
    const name = appData.data.name || 'Grand Theft Auto V';

    if (!price) {
      return {
        appId,
        name,
        isFree: appData.data.is_free || false,
        finalPrice: 0,
        initialPrice: 0,
        discountPercent: 0,
        currency: 'INR',
        finalFormatted: 'Free / Bundle'
      };
    }

    return {
      appId,
      name,
      finalPrice: price.final / 100,
      initialPrice: price.initial / 100,
      discountPercent: price.discount_percent || 0,
      currency: price.currency,
      finalFormatted: price.final_formatted,
      initialFormatted: price.initial_formatted || price.final_formatted,
      url: `https://store.steampowered.com/app/${appId}`
    };
  } catch (err) {
    console.error(`[Error fetching price for ${appId}]:`, err.message);
    return null;
  }
}

async function sendTelegramMessage(text) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('[Telegram] BOT_TOKEN or CHAT_ID missing. Skipping message.');
    return;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });

    const data = await res.json();
    if (!data.ok) {
      console.error('[Telegram API Error]:', data.description);
    } else {
      console.log('[Telegram] Notification delivered successfully!');
    }
  } catch (err) {
    console.error('[Telegram Send Error]:', err.message);
  }
}

function loadPreviousState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (_) {}
  }
  return {};
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

async function main() {
  console.log('='.repeat(65));
  console.log('           Steam Price Tracker - Telegram Notifier 🔥          ');
  console.log('='.repeat(65));
  console.log(`Checking prices for region: [${COUNTRY_CODE.toUpperCase()}]`);

  const prevState = loadPreviousState();
  const newState = { ...prevState };
  const isFirstRun = Object.keys(prevState).length === 0 || process.argv.includes('--test');

  for (const game of TRACKED_GAMES) {
    console.log(`\nQuerying Steam Store for: ${game.name} (AppID: ${game.appId})...`);
    const priceData = await fetchGamePrice(game.appId, COUNTRY_CODE);

    if (!priceData) {
      console.warn(`Could not retrieve price for ${game.name}. Skipping.`);
      continue;
    }

    const prevPriceInfo = prevState[game.appId.toString()];
    const currentPrice = priceData.finalPrice;
    const previousPrice = prevPriceInfo ? prevPriceInfo.finalPrice : null;

    console.log(`Current Price:    ${priceData.finalFormatted} (${priceData.currency})`);
    console.log(`Discount Percent: ${priceData.discountPercent}%`);
    if (previousPrice !== null) {
      console.log(`Previous Price:   ${prevPriceInfo.finalFormatted}`);
    }

    newState[game.appId.toString()] = {
      name: priceData.name,
      finalPrice: priceData.finalPrice,
      initialPrice: priceData.initialPrice,
      discountPercent: priceData.discountPercent,
      finalFormatted: priceData.finalFormatted,
      lastChecked: new Date().toISOString()
    };

    // Detect price changes
    if (previousPrice !== null && currentPrice < previousPrice) {
      // PRICE DROP!
      const savings = (previousPrice - currentPrice).toFixed(2);
      const msg = `🚨 <b>GTA V PRICE DROP ALERT!</b> 🔥\n\n` +
        `🎮 <b>Game:</b> ${priceData.name}\n` +
        `📉 <b>New Price:</b> <code>${priceData.finalFormatted}</code>\n` +
        `🏷️ <b>Old Price:</b> <s>${prevPriceInfo.finalFormatted}</s>\n` +
        `💰 <b>Discount:</b> -${priceData.discountPercent}% OFF (Save ${priceData.currency} ${savings})\n\n` +
        `⚡ <a href="${priceData.url}">👉 Click Here to Buy on Steam</a>`;

      console.log('\n[ALERT] Price decreased! Sending Telegram notification...');
      await sendTelegramMessage(msg);

    } else if (previousPrice !== null && currentPrice > previousPrice) {
      // PRICE INCREASED
      const msg = `📈 <b>GTA V Price Update:</b>\n\n` +
        `🎮 <b>Game:</b> ${priceData.name}\n` +
        `💵 <b>New Price:</b> <code>${priceData.finalFormatted}</code>\n` +
        `🏷️ <b>Old Price:</b> <s>${prevPriceInfo.finalFormatted}</s>\n` +
        `ℹ️ Sale has ended or price returned to normal.\n\n` +
        `🔗 <a href="${priceData.url}">View on Steam</a>`;

      console.log('\n[INFO] Price increased! Sending Telegram notification...');
      await sendTelegramMessage(msg);

    } else if (isFirstRun) {
      console.log('\n[First Run / Test] Sending initialization confirmation to Telegram...');
      const discountText = priceData.discountPercent > 0
        ? `🔥 <b>Currently on SALE:</b> -${priceData.discountPercent}% OFF!`
        : `ℹ️ Currently at regular price (no discount active).`;

      const msg = `🤖 <b>GTA V Price Tracker Activated!</b>\n\n` +
        `🎮 <b>Game:</b> ${priceData.name}\n` +
        `💵 <b>Current Live Price:</b> <code>${priceData.finalFormatted}</code> (${priceData.currency})\n` +
        `${discountText}\n\n` +
        `✅ <i>You will receive instant alerts here whenever the price increases or drops on Steam!</i>\n\n` +
        `🔗 <a href="${priceData.url}">View Steam Store Page</a>`;

      await sendTelegramMessage(msg);
    } else {
      console.log('Price has not changed. No notification needed.');
    }
  }

  saveState(newState);
  console.log('\n[Done] Price check finished and state saved.');
}

main().catch(err => {
  console.error('[Fatal Error]:', err);
  process.exit(1);
});

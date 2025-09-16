# -*- coding: utf-8 -*-
python

import telebot
from telebot import types
import time
import random

# Replace with your bot token from BotFather
BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE'
bot = telebot.TeleBot(BOT_TOKEN)

# Earnings data
gpu_earnings = {
    'RTX 4090': '$487/month',
    'RTX 4080': '$412/month',
    'RTX 4070': '$328/month',
    'RTX 3090': '$427/month',
    'RTX 3080': '$385/month',
    'RTX 3070': '$238/month',
    'RTX 3060': '$165/month',
    'RX 7900': '$395/month',
    'RX 6800': '$195/month',
    'Other GPU': '$50-500/month'
}

# Welcome message
@bot.message_handler(commands=['start'])
def send_welcome(message):
    markup = types.InlineKeyboardMarkup(row_width=2)
    
    btn1 = types.InlineKeyboardButton('💰 Calculate Earnings', callback_data='calculate')
    btn2 = types.InlineKeyboardButton('📊 Network Stats', callback_data='stats')
    btn3 = types.InlineKeyboardButton('🚀 Start Earning', url='https://hashnhedge.com')
    btn4 = types.InlineKeyboardButton('📄 Whitepaper', callback_data='whitepaper')
    btn5 = types.InlineKeyboardButton('💬 Join Community', url='https://discord.gg/hashnhedge')
    btn6 = types.InlineKeyboardButton('❓ How It Works', callback_data='how')
    
    markup.add(btn1, btn2)
    markup.add(btn3, btn4)
    markup.add(btn5, btn6)
    
    welcome_text = """
🎮 *Welcome to HashNHedge!*

Turn your idle GPU into a passive income machine! 

✅ Earn $50-500/month per GPU
✅ Auto-switches mining ↔️ security tasks
✅ Built on Solana (instant payouts)
✅ Join 5,000+ nodes earning daily

*Your GPU could be earning RIGHT NOW!*

Select an option below to get started:
"""
    
    bot.send_message(message.chat.id, welcome_text, parse_mode='Markdown', reply_markup=markup)

# Calculate earnings
@bot.callback_query_handler(func=lambda call: call.data == 'calculate')
def calculate_earnings(call):
    markup = types.InlineKeyboardMarkup(row_width=2)
    
    for gpu in gpu_earnings:
        btn = types.InlineKeyboardButton(gpu, callback_data=f'gpu_{gpu}')
        markup.add(btn)
    
    back_btn = types.InlineKeyboardButton('« Back', callback_data='back')
    markup.add(back_btn)
    
    bot.edit_message_text(
        chat_id=call.message.chat.id,
        message_id=call.message.message_id,
        text="*Select Your GPU Model:*\n\nDon't see your GPU? Most models earn $50-500/month!",
        parse_mode='Markdown',
        reply_markup=markup
    )

# Show earnings for specific GPU
@bot.callback_query_handler(func=lambda call: call.data.startswith('gpu_'))
def show_gpu_earnings(call):
    gpu = call.data.replace('gpu_', '')
    earnings = gpu_earnings.get(gpu, '$50-500/month')
    
    # Calculate detailed projections
    monthly = int(earnings.replace('$', '').replace('/month', '').split('-')[0])
    daily = monthly / 30
    yearly = monthly * 12
    
    markup = types.InlineKeyboardMarkup()
    start_btn = types.InlineKeyboardButton('🚀 Start Earning Now!', url='https://hashnhedge.com')
    calc_btn = types.InlineKeyboardButton('💰 Try Another GPU', callback_data='calculate')
    back_btn = types.InlineKeyboardButton('« Main Menu', callback_data='back')
    
    markup.add(start_btn)
    markup.add(calc_btn)
    markup.add(back_btn)
    
    earnings_text = f"""
💎 *{gpu} Earnings Potential*

📊 *Estimated Earnings:*
- Per Day: ${daily:.2f}
- Per Month: {earnings}
- Per Year: ${yearly:,}

⚡ *Earnings Breakdown:*
- Mining (60%): ${monthly * 0.6:.0f}/mo
- Security Tasks (30%): ${monthly * 0.3:.0f}/mo  
- Bonus Tasks (10%): ${monthly * 0.1:.0f}/mo

🎯 *ROI Examples:*
- Pays for Netflix + Spotify
- Covers monthly internet bill
- Funds your coffee addiction ☕

_*Actual earnings vary based on market conditions_

Ready to start earning?
"""
    
    bot.edit_message_text(
        chat_id=call.message.chat.id,
        message_id=call.message.message_id,
        text=earnings_text,
        parse_mode='Markdown',
        reply_markup=markup
    )

# Network stats
@bot.callback_query_handler(func=lambda call: call.data == 'stats')
def show_stats(call):
    # Simulate live stats
    nodes = random.randint(5000, 5500)
    daily_earnings = random.randint(12000, 15000)
    hash_rate = random.randint(800, 900)
    
    markup = types.InlineKeyboardMarkup()
    join_btn = types.InlineKeyboardButton('🚀 Join Network', url='https://hashnhedge.com')
    back_btn = types.InlineKeyboardButton('« Back', callback_data='back')
    
    markup.add(join_btn)
    markup.add(back_btn)
    
    stats_text = f"""
📊 *HashNHedge Network Stats*

🖥️ *Active Nodes:* {nodes:,}
💰 *24h Earnings:* ${daily_earnings:,}
⚡ *Network Hashrate:* {hash_rate} TH/s
🌐 *Network Status:* 🟢 Online

📈 *Token Stats:*
- Symbol: HNH
- Price: $0.05
- Market Cap: $50M
- Blockchain: Solana

🏆 *Top Earners Today:*
- Node #8472: $1,247
- Node #3921: $982
- Node #7153: $847

_Updated every 60 seconds_
"""
    
    bot.edit_message_text(
        chat_id=call.message.chat.id,
        message_id=call.message.message_id,
        text=stats_text,
        parse_mode='Markdown',
        reply_markup=markup
    )

# How it works
@bot.callback_query_handler(func=lambda call: call.data == 'how')
def how_it_works(call):
    markup = types.InlineKeyboardMarkup()
    start_btn = types.InlineKeyboardButton('🚀 Get Started', url='https://hashnhedge.com')
    video_btn = types.InlineKeyboardButton('📺 Watch Demo', url='https://youtube.com/watch?v=demo')
    back_btn = types.InlineKeyboardButton('« Back', callback_data='back')
    
    markup.add(start_btn)
    markup.add(video_btn)
    markup.add(back_btn)
    
    how_text = """
🎯 *How HashNHedge Works*

*1️⃣ Download & Install (2 mins)*
- Download node software
- Install with one click
- Enter wallet address

*2️⃣ Smart Task Switching*
- 🔄 Auto-switches between:
  - Crypto mining (Bitcoin, ETH Classic)
  - Security tasks (password recovery)
  - AI computations

*3️⃣ Earn & Get Paid*
- 💰 Earn HNH tokens + USD
- ⚡ Instant Solana payments
- 💳 Daily automatic payouts
- 📊 70% revenue share

*Why It Pays More:*
Companies pay $3/hour for GPU compute
We pay YOU $0.50/hour to provide it
Everyone wins! 🎉

*Zero Technical Knowledge Required!*
"""
    
    bot.edit_message_text(
        chat_id=call.message.chat.id,
        message_id=call.message.message_id,
        text=how_text,
        parse_mode='Markdown',
        reply_markup=markup
    )

# Back button handler
@bot.callback_query_handler(func=lambda call: call.data == 'back')
def go_back(call):
    send_welcome(call.message)

# Whitepaper
@bot.callback_query_handler(func=lambda call: call.data == 'whitepaper')
def send_whitepaper(call):
    bot.send_document(
        call.message.chat.id,
        'https://hashnhedge.com/whitepaper.pdf',
        caption='📄 *HashNHedge Whitepaper v1.0*\n\nLearn about our technology, tokenomics, and roadmap!',
        parse_mode='Markdown'
    )

# Broadcast message (for marketing)
@bot.message_handler(commands=['broadcast'])
def broadcast(message):
    # Only allow admin (replace with your Telegram ID)
    if message.from_user.id == YOUR_TELEGRAM_ID:
        broadcast_text = """
🔥 *Limited Time: 2X Earnings Event!*

For the next 48 hours, all new nodes get:
- 2X earnings multiplier
- Priority job allocation  
- Exclusive NFT badge

Join now: hashnhedge.com

_This opportunity won't last!_
"""
        # In production, this would send to all users
        bot.send_message(message.chat.id, broadcast_text, parse_mode='Markdown')

# Price alerts
@bot.message_handler(commands=['alert'])
def set_alert(message):
    bot.reply_to(message, 
    "🔔 *Price Alerts Coming Soon!*\n\nGet notified when:\n• HNH price moves ±10%\n• Your earnings increase\n• New features launch",
    parse_mode='Markdown')

# Run the bot
print("Bot is running...")
bot.polling()

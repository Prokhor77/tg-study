const TelegramBot = require('node-telegram-bot-api');
const token = '6364839064:AAGk3BfUkUTQptIwqCK8-0upCb5RleEql1w';
const bot = new TelegramBot(token, {polling: true});

const sqlite3 = require('sqlite3');
let currentChatId = null;
let currentQueryData = null;
let db1 = new sqlite3.Database('teachers.db');


bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    // Simulate a callback query with data equal to 'start'
    bot.emit('callback_query', {
        message: { chat: { id: chatId } },
        data: 'start'
    });
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    if (query.data === 'start') {
        bot.sendMessage(chatId, "Доброго времени суток.\n\nТут ты можешь проверить свои знания по предметам.Выбери тему, на которую хочешь пройти тест, а затем приступай к прохождению :)", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Для студента', callback_data: 'students' }],
                    [{ text: 'Для преподавателя', callback_data: 'prepod' }, { text: 'Для администрации', callback_data: 'admp' }],
                    [{ text: 'ID Tелеграмма', callback_data: 'showID' }],
                    [{ text: 'Панель разработчика', callback_data: 'razrab' }]
                ]
            }
        });
    }
}); // CALLBACK /START

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    if (query.data === 'showID') {
        await bot.sendMessage(chatId, `Ваш ID: ${query.from.id}`);
    }
}); // ID TG

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    if (query.data === 'razrab') {
        if (query.from.id === 1174671150) {
            await bot.sendMessage(chatId, "Выбери действие:", {
                reply_markup: {
                    inline_keyboard: [
                        [{text: 'Выдать доступ администратора', callback_data: 'admgive'},
                            {text: 'Выдать доступ преподователя', callback_data: 'prepodgive'}],
                    ]
                }
            });
        } else {
            await bot.answerCallbackQuery(query.id, 'У вас нет доступа к этой функции.');
        }
    }
}); // КНОПКИ РАЗРАБА

bot.on('callback_query', async (query) => {
    let db = new sqlite3.Database('administrators.db');
    const chatId = query.message.chat.id;
    if (query.data === 'admgive') {
        await bot.sendMessage(chatId, "Введи айди администратора, а после чего через пробел фамилию администратора.");
        bot.on('message', async (msg) => {
            if (msg.text && msg.text.includes(' ')) {
                const [admin_id, ...nameArr] = msg.text.split(' ');
                const name = nameArr.join(' ');

                await db.get(`SELECT * FROM admins WHERE admin_id = ?`, [admin_id], async function (err, row) {
                    if (err) {
                        return console.log(err.message);
                    }
                    if (row) {
                        await bot.sendMessage(chatId, "Такой айди уже зарегистрирован.", {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: 'На главную', callback_data: 'start' }]
                            ]
                        }
                    });

                    } else {
                        await db.run(`INSERT INTO admins (admin_id, name) VALUES (?, ?)`, [admin_id, name], function (err) {
                            bot.sendMessage(chatId, "Аккаунт администратора был успешно зарегестрирован. Нажмите на кнопку для продолжения.", {
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: 'На главную', callback_data: 'start' }]
                                    ]
                                }
                            });
                            if (err) {
                                return console.log(err.message);
                            }
                            db.close();
                        });
                    }
                });
            }
        });
    }
}); // ВЫДАЧА АДМИНКИ ОТ РАЗРАБА

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    let db = new sqlite3.Database('./teachers.db', sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(err.message);
        }
    });

    const showTeachers = async () => {
        await db.serialize(() => {
            db.all(`SELECT DISTINCT name FROM admins`, (err, rows) => {
                if (err) {
                    console.error(err.message);
                }
                let inline_keyboard = rows.map(row => [{ text: row.name, callback_data: row.name }]);
                // Add the 'На главную' button to the end of the inline keyboard
                inline_keyboard.push([{ text: 'На главную', callback_data: 'start' }]);
                bot.sendMessage(chatId, "Выберите предподавателя, чей тест вы хотите пройти:", {
                    reply_markup: {
                        inline_keyboard: inline_keyboard
                    }
                });
            });
        });
    }

    if (query.data === 'students') {
        await showTeachers();
        await db.close();
    } else if (query.data === 'Вернуться к выбору преподавателя') {
        await showTeachers();
    } else if (query.data) {
        const callbackData = query.data;
        await db.serialize(() => {
            db.all(`SELECT subject
            FROM admins
            WHERE name = '${callbackData}'`, (err, rows) => {
                if (rows && rows.length > 0) {
                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: rows.map(row => [{text: row.subject, callback_data: row.subject}]).concat
                            ([[{text: "Вернуться к выбору преподавателя", callback_data: 'Вернуться к выбору преподавателя'}],[{ text: 'На главную', callback_data: 'start' }]])
                        }
                    };
                    bot.sendMessage(chatId, `Выберите предмет у преподавателя: ${callbackData}`, keyboard);
                } else {
                }
            });
            db.close();
        });
    }
}); // ПОЛЬЗОВАТЕЛИ ПОЛУЧАЮТ МАТЕРИАЛ


bot.on('callback_query', async (query) => {
    currentChatId = query.message.chat.id;
    currentQueryData = query.data;
    if (currentQueryData === 'prepodgive') {
        await bot.sendMessage(currentChatId, "Введи айди преподавателя, а после чего через пробел фамилию преодавателя еще через пробел дисциплину, которую ведет\n\nПример: 437892 Кулецкая ТРПО.");
    }
});
bot.on('message', async (msg) => {
    if (currentChatId && currentQueryData === 'prepodgive' && msg.text && msg.text.includes(' ')) {
        const [teach_id, name, subject] = msg.text.split(' ');
        const row = await checkIfAdminExists(teach_id, name, subject);

        if (row) {
            await bot.sendMessage(currentChatId, "Такой предмет уже зарегистрирован у этого преподавателя.", {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'На главную', callback_data: 'start' }]
                    ]
                }
            });
        } else {
            await registerAdmin(teach_id, name, subject);
            await bot.sendMessage(currentChatId, "Аккаунт преподавателя был успешно зарегестрирован. Нажмите на кнопку для продолжения.", {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'На главную', callback_data: 'start' }]
                    ]
                }
            });
        }
    }
});
async function checkIfAdminExists(teach_id, name, subject) {
    return new Promise((resolve, reject) => {
        db1.get(`SELECT * FROM admins WHERE teach_id = ? AND name = ? AND subject = ?`, [teach_id, name, subject], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}
async function registerAdmin(teach_id, name, subject) {
    return new Promise((resolve, reject) => {
        db1.run(`INSERT INTO admins (teach_id, name, subject) VALUES (?, ?, ?)`, [teach_id, name, subject], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}                                                                               // ВЫДАЧА ПРЕПОДАВАТЕЛЯ ОТ РАЗРАБА



module.exports = function Calculator(mod) {
    let enabled = false;

    mod.command.add('calc', () => {
        enabled = !enabled;
        if (enabled) {
            sendMessage(`Calculator is now <font color='#00FF00'>enabled</font>.`);
            sendMessage(`<font color='#FFFF00'>Your chat will now be intercepted to check for math operations.</font>`);
        } else {
            sendMessage(`Calculator is now <font color='#FF0000'>disabled</font>.`);
        }
    });

    mod.hook('C_CHAT', 1, { order: 'early', filter: { fake: false } }, event => {
        if (!enabled || event.message.startsWith('/') || event.message.startsWith('!')) return;

        const raw = event.message.replace(/<\/?[^>]+(>|$)/g, "").trim();

        if (/^[0-9\s+\-*/().]+$/.test(raw) && /[\d]/.test(raw) && /[+\-*/]/.test(raw)) {
            try {
                const result = evaluateExpression(raw);
                sendMessage(`${raw} = <font color='#FFFF00'>${result}</font>`);
            } catch {
                sendMessage(`<font color='#FF0000'>Error: Invalid expression.</font>`);
            }
            return false;
        }
    });

    function evaluateExpression(expr) {
        if (/[^0-9\s+\-*/().]/.test(expr) || /__proto__|prototype|constructor/.test(expr)) {
            throw new Error('Invalid characters in expression.');
        }
        return Function(`"use strict"; return (${expr})`)();
    }

    function sendMessage(msg) {
        mod.command.message(msg);
    }

    this.destructor = function () {
        mod.command.remove('calc');
    };
};

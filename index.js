module.exports = function Calculator(mod) {
    // Configuration for memory optimization
    const CONFIG = {
        maxExpressionLength: 200,
        maxCalculationTime: 1000, // milliseconds
        maxParenthesesDepth: 20
    };
    
    let enabled = false;
    let activeCalculations = new Set(); // Track active calculations

    mod.command.add('calc', () => {
        enabled = !enabled;
        if (enabled) {
            sendMessage(`Calculator is now <font color='#00FF00'>enabled</font>.`);
            sendMessage(`<font color='#FFFF00'>Your chat will now be intercepted to check for math operations.</font>`);
        } else {
            // Clear all active calculations when disabled
            activeCalculations.clear();
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
        // Memory optimization: Check expression length
        if (expr.length > CONFIG.maxExpressionLength) {
            throw new Error(`Expression too long (max ${CONFIG.maxExpressionLength} characters)`);
        }
        
        // Remove whitespace
        expr = expr.replace(/\s/g, '');
        
        // Validate input - only allow numbers, operators, parentheses, and decimal points
        if (!/^[0-9+\-*/().]+$/.test(expr)) {
            throw new Error('Invalid characters in expression.');
        }
        
        // Check for balanced parentheses and depth
        let parenCount = 0;
        let maxDepth = 0;
        for (let char of expr) {
            if (char === '(') {
                parenCount++;
                maxDepth = Math.max(maxDepth, parenCount);
            }
            if (char === ')') parenCount--;
            if (parenCount < 0) throw new Error('Unbalanced parentheses');
        }
        if (parenCount !== 0) throw new Error('Unbalanced parentheses');
        if (maxDepth > CONFIG.maxParenthesesDepth) {
            throw new Error(`Expression too complex (max ${CONFIG.maxParenthesesDepth} nested parentheses)`);
        }
        
        // Parse and evaluate using recursive descent parser with timeout protection
        let index = 0;
        const startTime = Date.now();
        const calculationId = Math.random().toString(36).substr(2, 9);
        activeCalculations.add(calculationId);
        
        function checkTimeout() {
            if (Date.now() - startTime > CONFIG.maxCalculationTime) {
                throw new Error('Calculation timeout - expression too complex');
            }
            if (!activeCalculations.has(calculationId)) {
                throw new Error('Calculation cancelled');
            }
        }
        
        function parseExpression() {
            checkTimeout();
            let result = parseTerm();
            
            while (index < expr.length && (expr[index] === '+' || expr[index] === '-')) {
                checkTimeout();
                const operator = expr[index++];
                const term = parseTerm();
                result = operator === '+' ? result + term : result - term;
            }
            
            return result;
        }
        
        function parseTerm() {
            checkTimeout();
            let result = parseFactor();
            
            while (index < expr.length && (expr[index] === '*' || expr[index] === '/')) {
                checkTimeout();
                const operator = expr[index++];
                const factor = parseFactor();
                if (operator === '*') {
                    result *= factor;
                } else {
                    if (factor === 0) throw new Error('Division by zero');
                    result /= factor;
                }
            }
            
            return result;
        }
        
        function parseFactor() {
            checkTimeout();
            if (expr[index] === '(') {
                index++; // skip '('
                const result = parseExpression();
                if (expr[index] !== ')') throw new Error('Missing closing parenthesis');
                index++; // skip ')'
                return result;
            }
            
            return parseNumber();
        }
        
        function parseNumber() {
            let numStr = '';
            let hasDecimal = false;
            
            // Handle negative numbers
            if (expr[index] === '-') {
                numStr += expr[index++];
            }
            
            while (index < expr.length && (expr[index].match(/[0-9]/) || (expr[index] === '.' && !hasDecimal))) {
                if (expr[index] === '.') hasDecimal = true;
                numStr += expr[index++];
            }
            
            if (numStr === '' || numStr === '-') throw new Error('Invalid number');
            
            const num = parseFloat(numStr);
            if (isNaN(num)) throw new Error('Invalid number');
            
            return num;
        }
        
        try {
            const result = parseExpression();
            
            if (index < expr.length) {
                throw new Error('Unexpected characters at end of expression');
            }
            
            // Check for reasonable result ranges
            if (!isFinite(result)) {
                throw new Error('Result is not a finite number');
            }
            
            return result;
        } finally {
            // Always clean up the calculation tracking
            activeCalculations.delete(calculationId);
        }
    }

    function sendMessage(msg) {
        mod.command.message(msg);
    }

    this.destructor = function () {
        // Complete cleanup when module is unloaded
        enabled = false;
        activeCalculations.clear();
        mod.command.remove('calc');
    };
};

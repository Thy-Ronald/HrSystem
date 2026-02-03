const extractPValue = (text) => {
    if (!text || typeof text !== 'string') return 0;
    const regex = /P\s*[:\s\-=\(]*\s*(\d+(?:\.\d+)?)\s*\)?/gi;
    let sum = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (match[1]) {
            const value = parseFloat(match[1]);
            if (!isNaN(value)) {
                sum += value;
                console.log(`Matched: ${match[0]}, Value: ${value}`);
            }
        }
    }
    return sum;
};

const title = "[ PS Plugin ] make cards P:30";
console.log(`Testing title: "${title}"`);
const result = extractPValue(title);
console.log(`Result: ${result}`);

const withBody = "P: 120 and also p: 30";
console.log(`Testing withBody: "${withBody}"`);
console.log(`Result: ${extractPValue(withBody)}`);

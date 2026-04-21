const https = require('https');

// Supports both OpenAI and Groq — Groq is faster and free
var callAI = async function(systemPrompt, userPrompt) {
  var useGroq = !!process.env.GROQ_API_KEY;
  var apiKey  = useGroq ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY;

  if (!apiKey) throw new Error('No AI API key configured. Set GROQ_API_KEY or OPENAI_API_KEY in .env');

  var hostname = useGroq ? 'api.groq.com' : 'api.openai.com';
  var model    = useGroq ? 'llama3-8b-8192' : 'gpt-4o-mini';

  var body = JSON.stringify({
    model:    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    max_tokens:  1500,
    temperature: 0.7,
  });

  var options = {
    hostname: hostname,
    port: 443,
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type':  'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  };

  return new Promise(function(resolve, reject) {
    var req = https.request(options, function(res) {
      var chunks = [];
      res.on('data', function(c) { chunks.push(c); });
      res.on('end', function() {
        try {
          var result = JSON.parse(Buffer.concat(chunks).toString());
          if (result.error) return reject(new Error(result.error.message));
          resolve(result.choices[0].message.content);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

var generateLessonNote = async function(subject, className, topic, term) {
  var system = 'You are an expert Nigerian secondary school curriculum teacher. Generate structured, detailed lesson notes following the Nigerian curriculum standard. Always respond with valid JSON only, no markdown.';
  var user   = 'Generate a complete lesson note for:\nSubject: ' + subject + '\nClass: ' + className + '\nTopic: ' + topic + '\nTerm: ' + term + '\n\nReturn JSON with these exact fields:\n{\n  "topic": "",\n  "objectives": [""],\n  "duration": "",\n  "materials": [""],\n  "introduction": "",\n  "mainContent": [{"subtopic": "", "explanation": "", "examples": [""]}],\n  "classActivity": "",\n  "assignment": "",\n  "evaluation": [""],\n  "conclusion": ""\n}';

  var raw = await callAI(system, user);
  // Strip markdown code fences if present
  var clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
};

var smartAssistant = async function(role, query, contextData) {
  var system = 'You are SmartSchool AI assistant. You help ' + role + 's with school-related questions. Be concise, helpful and accurate. Use Nigerian school context where relevant.';
  var context = contextData ? '\n\nContext data:\n' + JSON.stringify(contextData) : '';
  var response = await callAI(system, query + context);
  return response;
};

module.exports = { generateLessonNote, smartAssistant };
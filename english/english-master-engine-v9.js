/* English Master grammar, contextual translation, favorites and dictionaries engine v9. */
(() => {
  'use strict';

  const vocabulary = window.ENGLISH_VOCABULARY || [];
  const modules = window.ENGLISH_MASTER_MODULES || [];
  const meta = window.ENGLISH_MASTER_META || {};
  if (!vocabulary.length || !modules.length) return;

  const STORE = {
    srs: 'learnit:english:srs:v2',
    quizzes: 'learnit:english:quizzes:v2',
    placement: 'learnit:english:placement:v2',
    favorites: 'learnit:english:favorites:v1',
    expandedStates: 'learnit:english:expanded:states:v1'
  };
  const parseStore = (key, fallback = {}) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch (_error) { return fallback; }
  };
  const writeStore = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const normalize = (value) => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();
  const titleCaseSentence = (value) => value ? value[0].toUpperCase() + value.slice(1) : value;
  const hash = (value) => [...String(value)].reduce((number, character) => ((number << 5) - number + character.charCodeAt(0)) | 0, 0);
  const seeded = (items, seed) => [...items].sort((a, b) => (hash(`${seed}:${a.id || a}`) >>> 0) - (hash(`${seed}:${b.id || b}`) >>> 0));
  const shuffle = (items, seed) => seeded(items, `${seed}:${items.length}`);
  const vocabById = new Map(vocabulary.map((entry) => [entry.id, entry]));
  const vocabByTerm = new Map(vocabulary.map((entry) => [normalize(entry.term), entry]));

  // Reuse authentic sentences already present in the owner's curriculum before
  // generating any artificial example. This enriches entries without inventing usage.
  const courseSentences = modules.flatMap((module) => module.lessons).flatMap((lesson) =>
    (lesson.englishContent || []).flatMap((block) => {
      const cells = block.rows ? block.rows.flat() : [];
      return [block.text, ...cells].filter(Boolean).flatMap((text) => String(text).split(/(?<=[.!?])\s+/));
    })
  ).map((sentence) => sentence.trim()).filter((sentence) => sentence.length >= 20 && sentence.length <= 220);
  let contextExamplesAdded = 0;
  vocabulary.forEach((entry) => {
    if (entry.example || entry.term.length < 2) return;
    const escaped = entry.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(^|[^A-Za-z])${escaped}([^A-Za-z]|$)`, 'i');
    const example = courseSentences.find((sentence) => pattern.test(sentence));
    if (!example) return;
    entry.example = example;
    entry.exampleSource = 'owner-course-context';
    contextExamplesAdded += 1;
  });
  meta.contextExamplesAdded = contextExamplesAdded;

  const toast = (message) => {
    let box = document.querySelector('.en-toast');
    if (!box) {
      box = document.createElement('div');
      box.className = 'en-toast';
      document.body.append(box);
    }
    box.textContent = message;
    box.classList.add('show');
    clearTimeout(box._timer);
    box._timer = setTimeout(() => box.classList.remove('show'), 2200);
  };

  // Every imported vocabulary entry must be reachable from a lesson, not only search.
  const referencedGroups = new Set(modules.flatMap((module) => module.lessons.map((lesson) => lesson.vocabGroupId).filter(Boolean)));
  const orphaned = vocabulary.filter((entry) => !entry.groups.some((group) => referencedGroups.has(group)));
  if (orphaned.length && !modules.some((module) => module.id === 'english-vocab-imported-extra')) {
    const group = 'vocab-imported-extra-review';
    orphaned.forEach((entry) => entry.groups.push(group));
    modules.push({
      id: 'english-vocab-imported-extra',
      number: 'E18',
      phase: 'review',
      icon: 'EN',
      title: 'English Master · Từ/cụm bổ sung từ giáo trình',
      desc: `${orphaned.length} từ/cụm nguồn trước đây chỉ tìm thấy trong từ điển, nay được gắn thành bài ôn riêng.`,
      lessons: [{
        title: `${orphaned.length} từ/cụm cần ôn bổ sung`,
        summary: 'Các mục nhập từ tài liệu nguồn chưa thuộc một bài từ vựng cụ thể.',
        duration: 45,
        code: 'READ → LISTEN → RECALL → USE → REVIEW',
        steps: [
          'Nghe từng từ/cụm và tự nói nghĩa trước khi nhìn đáp án.',
          'Đánh dấu Đang học, sau đó đưa mục từ vào lịch ôn cách quãng.',
          'Viết một câu đúng ngữ cảnh với các từ quan trọng.',
          'Chỉ đánh dấu Mastered sau khi nhớ lại đúng ở nhiều lần ôn.'
        ],
        verify: 'Hoàn thành quiz tối thiểu 80% và không còn mục đến hạn trong nhóm.',
        quiz: null,
        englishContent: [{ type: 'paragraph', text: 'Imported vocabulary review: every source entry is now reachable from the curriculum.' }],
        vocabGroupId: group
      }]
    });
    meta.moduleCount = modules.length;
    meta.lessonCount = modules.reduce((total, module) => total + module.lessons.length, 0);
  }

  const cleanMeaning = (entry) => String(entry?.meaning || '')
    .split('·')[0].split(';')[0].replace(/\([^)]*\)/g, '').trim();
  const wordTranslations = {
    i: 'tôi', you: 'bạn', he: 'anh ấy', she: 'cô ấy', it: 'nó', we: 'chúng tôi', they: 'họ',
    my: 'của tôi', your: 'của bạn', our: 'của chúng tôi', their: 'của họ',
    a: 'một', an: 'một', the: '', am: 'là', is: 'là', are: 'là', was: 'đã', were: 'đã',
    do: 'làm', does: 'làm', did: 'đã làm', not: 'không', no: 'không',
    can: 'có thể', could: 'có thể', should: 'nên', must: 'phải', will: 'sẽ', would: 'sẽ',
    and: 'và', or: 'hoặc', but: 'nhưng', because: 'bởi vì', if: 'nếu',
    in: 'trong', on: 'trên', at: 'tại', to: 'đến', from: 'từ', with: 'với', without: 'không có',
    this: 'này', that: 'đó', these: 'những thứ này', those: 'những thứ đó',
    what: 'điều gì', why: 'tại sao', where: 'ở đâu', when: 'khi nào', how: 'như thế nào',
    server: 'máy chủ', service: 'dịch vụ', system: 'hệ thống', error: 'lỗi', issue: 'sự cố',
    deploy: 'triển khai', restart: 'khởi động lại', check: 'kiểm tra', fix: 'sửa',
    running: 'đang chạy', failed: 'đã lỗi', down: 'ngừng hoạt động', slow: 'chậm',
    today: 'hôm nay', yesterday: 'hôm qua', tomorrow: 'ngày mai'
  };
  const translateSentence = (sentence) => {
    let text = normalize(sentence);
    const templates = [
      [/^the server is (running|down|slow|ready)$/, (_m, state) => `Máy chủ ${wordTranslations[state] || state}.`],
      [/^the service is (running|down|slow|ready)$/, (_m, state) => `Dịch vụ ${wordTranslations[state] || state}.`],
      [/^why are you (.+)$/, (_m, rest) => `Tại sao bạn đang ${translateTokens(rest)}?`],
      [/^why do you (.+)$/, (_m, rest) => `Tại sao bạn ${translateTokens(rest)}?`],
      [/^i (am|was) (.+)$/, (_m, be, rest) => `Tôi ${be === 'was' ? 'đã ' : ''}${translateTokens(rest)}.`],
      [/^i (will|can|must|should) (.+)$/, (_m, modal, rest) => `Tôi ${wordTranslations[modal]} ${translateTokens(rest)}.`],
      [/^(please )?(check|restart|fix|deploy) (.+)$/, (_m, polite, verb, rest) => `${polite ? 'Vui lòng ' : ''}${wordTranslations[verb]} ${translateTokens(rest)}.`],
      [/^(why|where|when|how|what) (.+)$/, (_m, question, rest) => `${titleCaseSentence(wordTranslations[question])} ${translateTokens(rest)}?`]
    ];
    for (const [pattern, render] of templates) if (pattern.test(text)) return render(...text.match(pattern));
    return `${titleCaseSentence(translateTokens(text))}.`;
  };
  const translateSentenceContextual = async (sentence) => {
    const local = translateSentence(sentence);
    const words = normalize(sentence).split(' ').filter(Boolean);
    if (words.length < 5) return { text: local, online: false };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const params = new URLSearchParams({ q: sentence.slice(0, 480), langpair: 'en|vi', mt: '1' });
      const response = await fetch(`https://api.mymemory.translated.net/get?${params}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Translation ${response.status}`);
      const payload = await response.json();
      const translated = String(payload.responseData?.translatedText || '').trim();
      const unchanged = normalize(translated) === normalize(sentence);
      const mostlyEnglish = translated.split(/\s+/).filter((word) => /^[a-z]+$/i.test(word)).length > translated.split(/\s+/).length * .72;
      if (!translated || unchanged || mostlyEnglish) throw new Error('Low confidence translation');
      return { text: translated, online: true };
    } catch (_error) {
      return { text: local, online: false };
    } finally {
      clearTimeout(timer);
    }
  };
  function translateTokens(text) {
    const tokens = normalize(text).split(' ').filter(Boolean);
    const output = [];
    for (let index = 0; index < tokens.length;) {
      let matched = false;
      for (let length = Math.min(5, tokens.length - index); length > 1; length -= 1) {
        const phrase = tokens.slice(index, index + length).join(' ');
        const entry = vocabByTerm.get(phrase);
        if (entry) {
          output.push(cleanMeaning(entry));
          index += length;
          matched = true;
          break;
        }
      }
      if (matched) continue;
      const token = tokens[index];
      const base = token.replace(/(ing|ed|es|s)$/, '');
      const entry = vocabByTerm.get(token) || vocabByTerm.get(base);
      output.push((wordTranslations[token] ?? wordTranslations[base] ?? cleanMeaning(entry)) || token);
      index += 1;
    }
    return output.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  }

  const vietnameseToEnglish = {
    tôi: 'I', bạn: 'you', 'anh ấy': 'he', 'cô ấy': 'she', chúng: 'we', họ: 'they',
    một: 'a', máy: 'machine', 'máy chủ': 'server', dịch: 'service', 'dịch vụ': 'service',
    hệ: 'system', 'hệ thống': 'system', đang: 'is', đã: 'did', sẽ: 'will', không: 'not',
    có: 'have', thể: 'can', nên: 'should', phải: 'must', và: 'and', hoặc: 'or', nhưng: 'but',
    trong: 'in', trên: 'on', tại: 'at', với: 'with', từ: 'from', đến: 'to',
    kiểm: 'check', 'kiểm tra': 'check', sửa: 'fix', lỗi: 'error', 'sự cố': 'issue',
    'khởi động lại': 'restart', triển: 'deploy', 'triển khai': 'deploy',
    chạy: 'running', chậm: 'slow', 'sẵn sàng': 'ready', 'hoạt động': 'running',
    'vui lòng': 'please', 'tại sao': 'why', 'ở đâu': 'where', 'khi nào': 'when'
  };
  const translateVietnamese = (sentence) => {
    const text = normalize(sentence);
    const templates = [
      [/^tại sao bạn đang khởi động lại (?:một )?máy chủ$/, 'Why are you restarting a server?'],
      [/^(?:cái )?máy chủ đang (?:chạy|hoạt động)$/, 'The server is running.'],
      [/^dịch vụ đang (?:chạy|hoạt động)$/, 'The service is running.'],
      [/^vui lòng kiểm tra dịch vụ$/, 'Please check the service.'],
      [/^tôi sẽ (.+)$/, (_match, rest) => `I will ${translateVietnameseTokens(rest)}.`],
      [/^tôi đang (.+)$/, (_match, rest) => `I am ${presentParticiple(translateVietnameseTokens(rest))}.`]
    ];
    for (const [pattern, result] of templates) {
      const match = text.match(pattern);
      if (match) return typeof result === 'function' ? result(...match) : result;
    }
    return titleCaseSentence(translateVietnameseTokens(text)).replace(/\s+/g, ' ').trim() + '.';
  };
  const translateVietnameseTokens = (text) => {
    const tokens = normalize(text).split(' ').filter(Boolean);
    const phrases = Object.keys(vietnameseToEnglish).sort((a, b) => b.split(' ').length - a.split(' ').length);
    const output = [];
    for (let index = 0; index < tokens.length;) {
      const phrase = phrases.find((candidate) => tokens.slice(index, index + candidate.split(' ').length).join(' ') === candidate);
      if (phrase) {
        output.push(vietnameseToEnglish[phrase]);
        index += phrase.split(' ').length;
      } else {
        const source = tokens[index];
        const entry = vocabulary.find((item) => normalize(cleanMeaning(item)).split(' ').includes(source));
        output.push(entry?.term || source);
        index += 1;
      }
    }
    return output.join(' ');
  };

  const baseVerbs = ['work', 'run', 'need', 'use', 'have', 'do', 'go', 'fix', 'check', 'restart', 'deploy', 'start', 'stop', 'fail', 'want', 'know', 'make', 'read', 'write', 'speak', 'learn'];
  const adjectives = ['ready', 'happy', 'slow', 'fast', 'down', 'available', 'busy', 'correct', 'wrong', 'safe', 'secure', 'open', 'closed', 'important'];
  const thirdPerson = (verb) => verb === 'have' ? 'has' : verb === 'do' ? 'does' : verb === 'go' ? 'goes'
    : /(?:s|sh|ch|x|z|o)$/.test(verb) ? `${verb}es` : /[^aeiou]y$/.test(verb) ? `${verb.slice(0, -1)}ies` : `${verb}s`;
  const presentParticiple = (verb) => verb === 'run' ? 'running' : verb === 'begin' ? 'beginning'
    : /ie$/.test(verb) ? `${verb.slice(0, -2)}ying`
    : /e$/.test(verb) && !/(ee|ye|oe)$/.test(verb) ? `${verb.slice(0, -1)}ing`
    : `${verb}ing`;
  const analyzeSentence = (input) => {
    const original = input.trim().replace(/\s+/g, ' ');
    let corrected = original;
    const issues = [];
    const add = (type, wrong, right, reason) => {
      if (!issues.some((issue) => issue.type === type && issue.wrong === wrong)) issues.push({ type, wrong, right, reason });
    };
    const replace = (pattern, replacer, issue) => {
      corrected = corrected.replace(pattern, (...args) => {
        const wrong = args[0];
        const right = typeof replacer === 'function' ? replacer(...args) : replacer;
        if (wrong !== right) add(issue.type, wrong, right, issue.reason);
        return right;
      });
    };

    replace(/\bi\b/g, 'I', { type: 'Viết hoa đại từ', reason: 'Đại từ “I” luôn phải viết hoa, dù đứng ở vị trí nào trong câu.' });
    replace(/\bI\s+(?:is|are)\b/gi, 'I am', { type: 'Hòa hợp chủ ngữ – động từ', reason: 'Chủ ngữ “I” đi với “am”, không đi với “is/are”.' });
    replace(/\b(he|she|it)\s+(?:am|are)\b/gi, (_all, subject) => `${subject} is`, { type: 'Hòa hợp chủ ngữ – động từ', reason: 'He/She/It ở hiện tại đi với “is”.' });
    replace(/\b(you|we|they)\s+(?:am|is)\b/gi, (_all, subject) => `${subject} are`, { type: 'Hòa hợp chủ ngữ – động từ', reason: 'You/We/They ở hiện tại đi với “are”.' });
    replace(/\b(can|could|should|must|may|might|will|would)\s+to\s+([a-z]+)/gi,
      (_all, modal, verb) => `${modal} ${verb}`,
      { type: 'Động từ khuyết thiếu', reason: 'Sau can/could/should/must/may/might/will/would dùng động từ nguyên mẫu không có “to”.' });
    replace(/\ba\s+([aeiou][a-z-]*)\b/gi,
      (_all, word) => /^(university|user|unit|one)/i.test(word) ? `a ${word}` : `an ${word}`,
      { type: 'Mạo từ a/an', reason: 'Dùng “an” trước âm nguyên âm; “a” đứng trước âm phụ âm. Quy tắc dựa vào âm đọc, không chỉ chữ cái.' });
    replace(/\ban\s+([bcdfgjklmnpqrstvwxyz][a-z-]*)\b/gi,
      (_all, word) => /^(honest|hour|honor|heir)/i.test(word) ? `an ${word}` : `a ${word}`,
      { type: 'Mạo từ a/an', reason: 'Dùng “a” trước âm phụ âm. Một số từ h câm như hour/honest vẫn dùng “an”.' });

    const questionLike = /^(what|why|where|when|how)\b/i.test(corrected);
    if (questionLike) {
      replace(/^(what|why|where|when|how)\s+(I|you|we|they|he|she|it)\s+(am|is|are)\b/i,
        (_all, wh, subject, be) => `${wh} ${be} ${subject}`,
        { type: 'Trật tự từ trong câu hỏi', reason: 'Với động từ “be”, thứ tự là: từ hỏi + be + chủ ngữ, ví dụ “Why is it…?”.' });
      replace(/^(what|why|where|when|how)\s+(he|she|it)\s+([a-z]+)\b/i,
        (_all, wh, subject, verb) => `${wh} does ${subject} ${verb.replace(/(?:ies|es|s)$/i, (tail) => tail === 'ies' ? 'y' : '')}`,
        { type: 'Trật tự từ trong câu hỏi', reason: 'Câu hỏi hiện tại với He/She/It dùng: từ hỏi + does + chủ ngữ + động từ nguyên mẫu.' });
      replace(/^(what|why|where|when|how)\s+(I|you|we|they)\s+([a-z]+)\b/i,
        (_all, wh, subject, verb) => `${wh} do ${subject} ${verb}`,
        { type: 'Trật tự từ trong câu hỏi', reason: 'Câu hỏi hiện tại dùng: từ hỏi + do + chủ ngữ + động từ nguyên mẫu.' });
      replace(/^(what|why|where|when|how)\s+(am|is|are)\s+(I|you|we|they|he|she|it)\s+([a-z]+)\b/i,
        (_all, wh, be, subject, verb) => `${wh} ${be} ${subject} ${presentParticiple(verb)}`,
        { type: 'Thì hiện tại tiếp diễn', reason: 'Sau am/is/are trong câu đang diễn ra cần dùng động từ V-ing: be + subject + V-ing.' });
    }

    replace(/\b(I|you|we|they|he|she|it)\s+([a-z]+)\s+(always|usually|often|sometimes|never)\b/gi,
      (_all, subject, verb, adverb) => `${subject} ${adverb} ${verb}`,
      { type: 'Vị trí trạng từ tần suất', reason: 'Trạng từ always/usually/often/sometimes/never thường đứng trước động từ thường, nhưng đứng sau động từ “be”.' });

    for (const adjective of adjectives) {
      const pattern = new RegExp(`\\\\b(I|you|we|they|he|she|it|the server|the service|the system)\\\\s+(${adjective})\\\\b`, 'gi');
      replace(pattern,
        (_all, subject, word) => `${subject} ${/^I$/i.test(subject) ? 'am' : /^(you|we|they)$/i.test(subject) ? 'are' : 'is'} ${word}`,
        { type: 'Thiếu động từ be', reason: 'Tính từ không đứng trực tiếp sau chủ ngữ trong mẫu câu này; cần am/is/are để nối chủ ngữ với tính từ.' });
    }

    for (const verb of baseVerbs) {
      const pattern = new RegExp(`\\\\b(he|she|it)\\\\s+${verb}\\\\b`, 'gi');
      replace(pattern, (_all, subject) => `${subject} ${thirdPerson(verb)}`,
        { type: 'Ngôi thứ ba số ít', reason: 'Ở hiện tại đơn, động từ sau He/She/It thường thêm -s/-es; các động từ bất quy tắc dùng dạng riêng.' });
    }
    replace(/\b(I|you|we|they)\s+(has|does)\b/gi,
      (_all, subject, verb) => `${subject} ${verb.toLowerCase() === 'has' ? 'have' : 'do'}`,
      { type: 'Hòa hợp chủ ngữ – động từ', reason: 'I/You/We/They dùng have/do; has/does dùng với He/She/It.' });

    corrected = corrected.replace(/\s+([,.!?;:])/g, '$1').replace(/([,.!?;:])([A-Za-z])/g, '$1 $2').trim();
    corrected = titleCaseSentence(corrected);
    if (questionLike && !/[?]$/.test(corrected)) corrected += '?';
    else if (!/[.!?]$/.test(corrected)) corrected += '.';
    return {
      original,
      corrected,
      issues,
      correct: issues.length === 0,
      translation: translateSentence(corrected)
    };
  };

  const knownTypos = {
    stding: 'studying', teh: 'the', recieve: 'receive', adress: 'address', becuase: 'because',
    dont: "don't", cant: "can't", doesnt: "doesn't", didnt: "didn't", im: "I'm", ive: "I've",
    thier: 'their', wich: 'which', enviroment: 'environment', seperate: 'separate',
    occured: 'occurred', succesful: 'successful', deployement: 'deployment',
    configration: 'configuration', avaliable: 'available', alredy: 'already',
    shoud: 'should', coud: 'could', woud: 'would', langauge: 'language',
    sentense: 'sentence', grammer: 'grammar', mesage: 'message',
    writed: 'wrote', goed: 'went', eated: 'ate', taked: 'took', maked: 'made',
    buyed: 'bought', catched: 'caught', teached: 'taught', thinked: 'thought',
    bringed: 'brought', runned: 'ran', speaked: 'spoke', breaked: 'broke',
    choosed: 'chose', comed: 'came'
  };
  let localLexicon;
  const getLocalLexicon = () => {
    if (localLexicon) return localLexicon;
    const words = new Set([
      ...Object.keys(wordTranslations), ...Object.values(knownTypos),
      ...baseVerbs, ...adjectives,
      'about', 'above', 'after', 'again', 'against', 'all', 'also', 'always', 'another',
      'any', 'before', 'between', 'both', 'each', 'every', 'few', 'first', 'good', 'great',
      'here', 'just', 'more', 'most', 'new', 'now', 'only', 'other', 'please', 'really',
      'same', 'some', 'still', 'than', 'then', 'there', 'through', 'under', 'very', 'well',
      'who', 'whom', 'whose', 'which', 'while', 'yes', 'yet'
    ]);
    vocabulary.forEach((entry) => normalize(entry.term).split(' ').forEach((word) => words.add(word)));
    courseSentences.forEach((sentence) => normalize(sentence).split(' ').forEach((word) => words.add(word)));
    [...words].forEach((word) => {
      if (!/^[a-z]{2,}$/.test(word)) return;
      words.add(`${word}s`);
      words.add(`${word}ed`);
      words.add(presentParticiple(word));
    });
    localLexicon = [...words].filter((word) => /^[a-z][a-z']+$/.test(word));
    return localLexicon;
  };
  const spellingCandidates = (word) => {
    const clean = normalize(word);
    if (!clean || clean.length < 3) return [];
    return getLocalLexicon().map((candidate) => ({
      candidate,
      distance: levenshtein(clean, candidate),
      prefix: candidate[0] === clean[0] ? 1 : 0
    })).filter((item) => item.distance <= (clean.length >= 8 ? 3 : clean.length >= 5 ? 2 : 1))
      .sort((a, b) => a.distance - b.distance || b.prefix - a.prefix || Math.abs(a.candidate.length - clean.length) - Math.abs(b.candidate.length - clean.length))
      .slice(0, 5).map((item) => item.candidate);
  };
  const localSpellingPass = (input) => {
    let corrected = input;
    const issues = [];
    const tokens = [...input.matchAll(/\b[A-Za-z][A-Za-z']*\b/g)].reverse();
    const lexicon = new Set(getLocalLexicon());
    tokens.forEach((match) => {
      const raw = match[0];
      const lower = raw.toLowerCase();
      const prefixed = lower.match(/^(un|re|dis|mis|non|pre|post|over|under)([a-z]{3,})$/);
      if (lexicon.has(lower) || (prefixed && lexicon.has(prefixed[2])) || (match.index > 0 && /^[A-Z]/.test(raw))) return;
      const preferred = knownTypos[lower];
      const alternatives = [...new Set([preferred, ...spellingCandidates(lower)].filter(Boolean))];
      if (!alternatives.length) return;
      const replacement = preferred || alternatives[0];
      if (!preferred && levenshtein(lower, replacement) > 1) return;
      corrected = `${corrected.slice(0, match.index)}${replacement}${corrected.slice(match.index + raw.length)}`;
      issues.unshift({
        type: 'Sai chính tả',
        wrong: raw,
        right: replacement,
        alternatives,
        reason: `“${raw}” không có trong từ điển kiểm tra. Từ gần nhất theo chính tả là “${replacement}”; hãy chọn theo đúng ý bạn muốn diễn đạt.`
      });
    });
    return { corrected, issues };
  };
  const languageToolReason = (match, wrong, replacement) => {
    const category = match.rule?.category?.id || '';
    const message = `${match.message || ''} ${match.shortMessage || ''}`;
    if (/TYPOS|SPELL/i.test(category) || /MORFOLOGIK|SPELL/i.test(match.rule?.id || '')) {
      return `“${wrong}” có khả năng viết sai chính tả. Đề xuất ưu tiên là “${replacement}”.`;
    }
    if (/article|vowel sound|wrong article/i.test(message)) {
      return `Mạo từ chưa phù hợp. Dùng “an” trước âm nguyên âm và “a” trước âm phụ âm; cần xét âm đọc của từ kế tiếp.`;
    }
    if (/agreement|third-person|pronoun.*used with/i.test(message)) {
      return `Chủ ngữ và động từ chưa hòa hợp. He/She/It dùng dạng ngôi thứ ba số ít; I/You/We/They dùng dạng cơ bản phù hợp.`;
    }
    if (/auxiliary verb.*base form|after.*do.*base/i.test(message)) {
      return `Sau trợ động từ do/does/did phải dùng động từ nguyên mẫu, không thêm -s/-es hoặc chia quá khứ.`;
    }
    if (/past tense|irregular verb/i.test(message)) {
      return `Dạng quá khứ chưa đúng. Đây có thể là động từ bất quy tắc nên không thể chỉ thêm “-ed”.`;
    }
    if (/GRAMMAR|CONFUSED_WORDS/i.test(category)) {
      return `Cấu trúc hoặc cách dùng từ chưa phù hợp trong ngữ cảnh này. Đề xuất thay “${wrong}” bằng “${replacement}”.`;
    }
    if (/PUNCTUATION/i.test(category)) return `Dấu câu hoặc khoảng trắng chưa đúng chuẩn; hãy dùng dạng “${replacement}”.`;
    if (/CASING|TYPOGRAPHY/i.test(category)) return `Cần sửa cách viết hoa hoặc hình thức trình bày thành “${replacement}”.`;
    return `Cách viết này cần được xem lại trong ngữ cảnh hiện tại; đề xuất “${replacement}”.`;
  };
  const languageToolPass = async (input) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
      const body = new URLSearchParams({ text: input, language: 'en-US', enabledOnly: 'false' });
      const response = await fetch('https://api.languagetool.org/v2/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`LanguageTool ${response.status}`);
      const payload = await response.json();
      const issues = [];
      let corrected = input;
      [...(payload.matches || [])].sort((a, b) => b.offset - a.offset).forEach((match) => {
        const wrong = input.slice(match.offset, match.offset + match.length);
        const alternatives = (match.replacements || []).slice(0, 6).map((item) => item.value).filter(Boolean);
        const replacement = alternatives[0] || wrong;
        issues.unshift({
          type: /MORFOLOGIK|SPELL|TYPOS/i.test(`${match.rule?.id} ${match.rule?.category?.id}`) ? 'Sai chính tả' : 'Ngữ pháp và cách dùng',
          wrong,
          right: replacement,
          alternatives,
          reason: languageToolReason(match, wrong, replacement)
        });
        if (replacement !== wrong) corrected = `${corrected.slice(0, match.offset)}${replacement}${corrected.slice(match.offset + match.length)}`;
      });
      return { corrected, issues, online: true };
    } catch (_error) {
      return { corrected: input, issues: [], online: false };
    } finally { clearTimeout(timer); }
  };
  const incompleteSentencePass = (input) => {
    const text = input.trim();
    const normalized = normalize(text);
    const issues = [];
    let corrected = text;
    if (/^[a-z]+ing\s+\w+/i.test(text) && !/^(being|according|following)\b/i.test(text)) {
      const phrase = text.replace(/[.!?]+$/, '');
      corrected = `I am ${phrase[0].toLowerCase()}${phrase.slice(1)}.`;
      issues.push({
        type: 'Câu chưa hoàn chỉnh',
        wrong: text,
        right: corrected,
        alternatives: [corrected, corrected.replace(/\byou\b/i, 'with you')],
        reason: 'Câu bắt đầu bằng V-ing nhưng thiếu chủ ngữ và trợ động từ. Một câu hoàn chỉnh cần chủ ngữ + am/is/are + V-ing.'
      });
    } else if (normalized.split(' ').length === 1 && !/[.!?]$/.test(text)) {
      issues.push({
        type: 'Cụm từ, chưa phải câu',
        wrong: text,
        right: text,
        alternatives: [],
        reason: 'Nội dung chỉ có một từ. Hãy thêm chủ ngữ và động từ để tạo thành câu hoàn chỉnh.'
      });
    }
    return { corrected, issues };
  };
  const mergeIssues = (...groups) => {
    const output = [];
    groups.flat().forEach((issue) => {
      const key = `${normalize(issue.wrong)}:${normalize(issue.right)}:${issue.type}`;
      if (!output.some((item) => item.key === key)) output.push({ ...issue, key });
    });
    return output;
  };
  const analyzeSentenceAdvanced = async (input) => {
    const localSpell = localSpellingPass(input.trim());
    const remote = await languageToolPass(localSpell.corrected);
    const fragment = incompleteSentencePass(remote.corrected);
    const localGrammar = analyzeSentence(fragment.corrected);
    const issues = mergeIssues(localSpell.issues, remote.issues, fragment.issues, localGrammar.issues);
    const translation = await translateSentenceContextual(localGrammar.corrected);
    return {
      original: input.trim(),
      corrected: localGrammar.corrected,
      issues,
      correct: issues.length === 0,
      online: remote.online,
      translation
    };
  };

  const currentLesson = () => {
    const moduleIndex = Number(document.querySelector('[data-en-module].active')?.dataset.enModule || 0);
    const lessonIndex = Number(document.querySelector('[data-en-lesson].active')?.dataset.enLesson || 0);
    return { moduleIndex, lessonIndex, module: modules[moduleIndex], lesson: modules[moduleIndex]?.lessons[lessonIndex] };
  };
  const currentLessonKey = () => {
    const { module, lessonIndex } = currentLesson();
    return module ? `${module.id}-${lessonIndex}` : '';
  };
  const lessonEntries = (lesson, key) => {
    const grouped = lesson?.vocabGroupId ? vocabulary.filter((entry) => entry.groups.includes(lesson.vocabGroupId)) : [];
    const category = /it|linux|devops|technical|documentation/i.test(`${lesson?.title} ${lesson?.summary}`) ? 'it'
      : /work|email|meeting|interview|ticket|chat/i.test(`${lesson?.title} ${lesson?.summary}`) ? 'work' : 'course';
    const fallback = vocabulary.filter((entry) => entry.categories.includes(category) && cleanMeaning(entry));
    return seeded(grouped.length >= 5 ? grouped : fallback, key).slice(0, 20);
  };
  const quizState = () => parseStore(STORE.quizzes);
  const quizPassed = (key) => Boolean(quizState()[key]?.passed);
  const makeQuestions = (entries, key, limit = 5) => entries.slice(0, limit).map((entry, index) => {
    const distractors = seeded(vocabulary.filter((item) => item.id !== entry.id && cleanMeaning(item) && item.categories.some((category) => entry.categories.includes(category))), `${key}:d:${index}`)
      .slice(0, 3).map(cleanMeaning);
    const options = shuffle([cleanMeaning(entry), ...distractors], `${key}:o:${index}`);
    return { entry, options, answer: options.indexOf(cleanMeaning(entry)) };
  });

  const renderQuiz = () => {
    const lessonRoot = document.querySelector('#en-lesson');
    if (!lessonRoot || lessonRoot.querySelector('[data-upgrade-quiz]')) return;
    const { lesson } = currentLesson();
    if (!lesson) return;
    const key = currentLessonKey();
    const entries = lessonEntries(lesson, key);
    if (entries.length < 5) return;
    const questions = makeQuestions(entries, key);
    const passed = quizPassed(key);
    const box = document.createElement('section');
    box.className = 'en-quiz';
    box.dataset.upgradeQuiz = key;
    box.innerHTML = `<div class="en-quiz-head"><div><p class="eyebrow">Kiểm tra theo bài</p><h3>Quiz 5 câu · cần đúng ít nhất 4/5</h3></div><span class="en-quiz-score">${passed ? '✓ Đã đạt' : 'Chưa làm'}</span></div>
      ${questions.map((question, questionIndex) => `<article class="en-question" data-question="${questionIndex}" data-answer="${question.answer}"><p>${questionIndex + 1}. “${esc(question.entry.term)}” phù hợp nhất với nghĩa nào?</p><div class="en-options">${question.options.map((option, optionIndex) => `<button type="button" class="en-option" data-option="${optionIndex}">${esc(option)}</button>`).join('')}</div><p class="en-question-feedback"></p></article>`).join('')}
      <div class="en-actions"><button type="button" class="en-primary" data-quiz-submit>Chấm bài</button><span class="en-quiz-locked">${passed ? 'Bài học đã được mở khóa hoàn thành.' : 'Đạt quiz để mở khóa nút hoàn thành.'}</span></div>`;
    lessonRoot.append(box);
    const complete = lessonRoot.querySelector('#en-complete');
    complete?.classList.toggle('locked', !passed);
    box.addEventListener('click', (event) => {
      const option = event.target.closest('[data-option]');
      if (option) {
        const question = option.closest('.en-question');
        question.querySelectorAll('.en-option').forEach((button) => button.classList.remove('selected'));
        option.classList.add('selected');
        question.dataset.selected = option.dataset.option;
        return;
      }
      if (!event.target.closest('[data-quiz-submit]')) return;
      let correct = 0;
      box.querySelectorAll('.en-question').forEach((question) => {
        const selected = Number(question.dataset.selected);
        const answer = Number(question.dataset.answer);
        question.querySelectorAll('.en-option').forEach((button) => {
          button.classList.toggle('correct', Number(button.dataset.option) === answer);
          button.classList.toggle('wrong', Number(button.dataset.option) === selected && selected !== answer);
        });
        const feedback = question.querySelector('.en-question-feedback');
        if (selected === answer) { correct += 1; feedback.textContent = '✓ Chính xác.'; }
        else feedback.textContent = `Đáp án đúng: ${question.querySelector(`[data-option="${answer}"]`).textContent}`;
      });
      const passedNow = correct >= 4;
      const state = quizState();
      state[key] = { score: correct, total: 5, passed: passedNow, at: new Date().toISOString() };
      writeStore(STORE.quizzes, state);
      box.querySelector('.en-quiz-score').textContent = `${correct}/5 ${passedNow ? '· ✓ Đã đạt' : '· Chưa đạt'}`;
      box.querySelector('.en-quiz-locked').textContent = passedNow ? 'Đã mở khóa hoàn thành bài.' : 'Cần ít nhất 4/5. Hãy xem lại và làm lại.';
      complete?.classList.toggle('locked', !passedNow);
      toast(passedNow ? 'Đã đạt quiz và mở khóa bài học.' : `Bạn đạt ${correct}/5, cần ít nhất 4/5.`);
      refreshProgress();
    });
  };

  const srs = () => parseStore(STORE.srs);
  const scheduleWord = (id, quality = 2) => {
    const data = srs();
    const previous = data[id] || { interval: 0, repetitions: 0, ease: 2.5 };
    const next = { ...previous };
    if (quality === 0) { next.interval = 0; next.repetitions = 0; next.ease = Math.max(1.3, next.ease - .2); }
    else if (quality === 1) { next.interval = Math.max(1, Math.round(previous.interval * 1.2) || 1); next.ease = Math.max(1.3, next.ease - .1); }
    else {
      next.repetitions += 1;
      next.interval = next.repetitions === 1 ? 1 : next.repetitions === 2 ? 3 : Math.max(5, Math.round(previous.interval * (quality === 3 ? next.ease + .25 : next.ease)));
      if (quality === 3) next.ease = Math.min(3.2, next.ease + .1);
    }
    next.due = Date.now() + next.interval * 86400000;
    next.last = Date.now();
    data[id] = next;
    writeStore(STORE.srs, data);
  };
  const dueEntries = () => {
    const data = srs();
    const due = vocabulary.filter((entry) => data[entry.id] && data[entry.id].due <= Date.now());
    if (due.length) return due;
    return vocabulary.filter((entry) => !data[entry.id]).slice(0, 100);
  };

  const estimatedLevel = (entry) => {
    if (entry.categories.includes('foundation')) {
      const index = Number(entry.id.replace(/\D/g, '')) || 1;
      return index <= 600 ? 'A1' : index <= 1200 ? 'A2' : index <= 1900 ? 'B1' : 'B2';
    }
    if (entry.categories.includes('daily')) return 'A2';
    if (entry.categories.includes('work')) return 'B1–B2';
    if (entry.categories.includes('it')) return 'B1–C1 IT';
    return 'B1';
  };
  const estimatedPos = (entry) => {
    const term = normalize(entry.term);
    const functionWords = {
      the: 'article', a: 'article', an: 'article', and: 'conjunction', or: 'conjunction', but: 'conjunction',
      in: 'preposition', on: 'preposition', at: 'preposition', for: 'preposition', with: 'preposition',
      i: 'pronoun', you: 'pronoun', he: 'pronoun', she: 'pronoun', it: 'pronoun', we: 'pronoun', they: 'pronoun',
      can: 'modal verb', could: 'modal verb', should: 'modal verb', must: 'modal verb', will: 'modal verb'
    };
    if (functionWords[term]) return functionWords[term];
    if (term.includes(' ')) return 'phrase';
    if (/ly$/.test(term)) return 'adverb';
    if (/(tion|ment|ness|ity|er|or)$/.test(term)) return 'noun';
    if (/(ous|ful|less|able|ive|al|ic)$/.test(term)) return 'adjective';
    if (/(ing|ize|ise|fy)$/.test(term)) return 'verb / form';
    return 'word';
  };
  const decorateVocabulary = (root = document) => {
    root.querySelectorAll('.en-card,.en-vocab-row').forEach((card) => {
      if (card.dataset.enMeta) return;
      const term = card.querySelector('h3,b')?.textContent?.trim();
      const entry = vocabByTerm.get(normalize(term));
      if (!entry) return;
      card.dataset.enMeta = '1';
      if (card.classList.contains('en-card')) {
        const entryIndex = vocabulary.indexOf(entry) + 1;
        const sourceCounter = card.querySelector('footer>small');
        if (sourceCounter) {
          sourceCounter.className = 'en-entry-counter';
          sourceCounter.textContent = `${String(entryIndex).padStart(4, '0')} / ${vocabulary.length.toLocaleString('vi-VN')}`;
        }
        const head = card.querySelector('.en-card-head');
        const speakButton = head?.querySelector('.en-speak');
        if (head && speakButton && !head.querySelector('.en-card-controls')) {
          const favorites = parseStore(STORE.favorites);
          const controls = document.createElement('div');
          controls.className = 'en-card-controls';
          controls.innerHTML = `<button type="button" class="en-favorite ${favorites[entry.id] ? 'active' : ''}" data-en-favorite="${entry.id}" aria-label="${favorites[entry.id] ? 'Bỏ đánh dấu' : 'Đánh dấu từ này'}" title="${favorites[entry.id] ? 'Bỏ đánh dấu' : 'Đánh dấu từ này'}">★</button>`;
          speakButton.before(controls);
          controls.append(speakButton);
        }
      }
      const metaBox = document.createElement('div');
      metaBox.className = 'en-meta';
      metaBox.innerHTML = `<span>${esc(estimatedLevel(entry))}</span><span>${esc(estimatedPos(entry))} · ước tính</span><span>${entry.example ? 'Có ngữ cảnh' : 'Cần bổ sung ví dụ'}</span>`;
      const anchor = card.querySelector('blockquote,footer,.en-state');
      if (anchor) anchor.before(metaBox); else card.append(metaBox);
    });
  };

  const hubMarkup = () => `<section class="en-upgrade-hub" id="english-practice-lab">
    <div class="en-upgrade-head"><div><p class="eyebrow">English Intelligence Lab</p><h3>Sửa câu, ôn cách quãng, nghe–nói và kiểm tra đầu vào</h3><p>Tiến độ lưu trên trình duyệt; câu cần kiểm tra sâu có thể được gửi tới LanguageTool và bộ dịch ngữ cảnh.</p></div><div class="en-tool-tabs">
      <button type="button" class="en-tool-tab active" data-tool="sentence">Sửa lỗi câu</button>
      <button type="button" class="en-tool-tab" data-tool="review">Ôn đến hạn</button>
      <button type="button" class="en-tool-tab" data-tool="listening">Nghe–chép</button>
      <button type="button" class="en-tool-tab" data-tool="pronunciation">Phát âm</button>
      <button type="button" class="en-tool-tab" data-tool="placement">Đầu vào</button>
      <button type="button" class="en-tool-tab" data-tool="progress">Tiến độ</button>
    </div></div>
    <div class="en-tool-panel active" data-tool-panel="sentence"><div class="en-tool-grid">
      <div><label class="en-field"><span>Nhập một câu tiếng Anh</span><textarea class="en-sentence-input" placeholder="Ví dụ: Why you are restart a server?"></textarea></label><div class="en-actions"><button type="button" class="en-primary" data-analyze-sentence>Kiểm tra và sửa câu</button><button type="button" data-sentence-example>Dùng câu ví dụ</button></div><div class="en-inline-translation" data-sentence-translation hidden><span>Bản dịch tiếng Việt</span><p></p><small data-translation-note></small></div></div>
      <div class="en-result empty" data-sentence-result>Nhập câu để xem dấu xác nhận, câu sửa hoàn chỉnh và giải thích trật tự từ.</div>
    </div></div>
    <div class="en-tool-panel" data-tool-panel="review"><div class="en-review-card"><div><p class="eyebrow">Spaced repetition</p><div class="en-review-prompt">Đang chuẩn bị thẻ ôn…</div><p class="en-review-hint"></p></div><input class="en-review-input" placeholder="Nhập nghĩa tiếng Việt bạn nhớ được"><div class="en-actions"><button type="button" class="en-primary" data-review-check>Kiểm tra</button><button type="button" data-review-reveal>Hiện đáp án</button></div><div class="en-review-answer"></div><div class="en-rating"><button data-rate="0">Quên · ôn lại</button><button data-rate="1">Khó · 1 ngày</button><button data-rate="2">Tốt</button><button data-rate="3">Dễ</button></div></div></div>
    <div class="en-tool-panel" data-tool-panel="listening"><div class="en-listen-stage"><p class="eyebrow">Listening dictation</p><h4>Nghe rồi gõ lại chính xác</h4><p class="en-review-hint">Có thể nghe lại nhiều lần và điều chỉnh tốc độ.</p><div class="en-actions"><button type="button" class="en-primary" data-listen-play>▶ Nghe</button><select data-listen-rate><option value=".7">Chậm 0,7×</option><option value=".86" selected>Chuẩn 0,86×</option><option value="1">Tự nhiên 1×</option></select><button type="button" data-listen-new>Câu khác</button></div><label class="en-field"><span>Câu bạn nghe được</span><input data-listen-input autocomplete="off"></label><button type="button" data-listen-check>Kiểm tra nghe</button><p class="en-listen-feedback"></p></div></div>
    <div class="en-tool-panel" data-tool-panel="pronunciation"><div class="en-pronounce-stage"><p class="eyebrow">Speech recognition</p><h4>Nghe mẫu, thu giọng và so khớp nội dung</h4><label class="en-field"><span>Câu luyện nói</span><input class="en-pronounce-target" value="The service is running normally."></label><div class="en-actions"><button type="button" data-pronounce-model>◖)) Nghe mẫu</button><button type="button" class="en-primary" data-pronounce-record>● Bắt đầu nói</button></div><p class="en-pronounce-feedback">Trình duyệt Chrome/Edge hỗ trợ nhận diện tốt nhất.</p></div></div>
    <div class="en-tool-panel" data-tool-panel="placement"><div class="en-placement-stage"><p class="eyebrow">Placement test</p><h4>Kiểm tra nhanh English for IT</h4><p>Bài 20 câu ước lượng sơ bộ A1–C1; kết quả không thay thế chứng chỉ chuẩn hóa.</p><div data-placement-body></div><div class="en-actions"><button type="button" class="en-primary" data-placement-start>Bắt đầu bài kiểm tra</button></div><p class="en-placement-feedback"></p></div></div>
    <div class="en-tool-panel" data-tool-panel="progress"><div class="en-progress-grid" data-progress-grid></div><div class="en-actions"><button type="button" class="en-primary" data-export-progress>Xuất bản sao tiến độ</button><button type="button" data-import-progress>Nhập tiến độ</button><input class="en-import" type="file" accept="application/json"></div><p class="en-disclaimer">Bản sao gồm các khóa localStorage LearnIT English; không chứa file âm thanh.</p></div>
  </section>`;

  let reviewEntry = null;
  let listeningEntry = null;
  const chooseReview = () => {
    const candidates = dueEntries();
    reviewEntry = candidates[Math.abs(hash(`${Date.now()}:${candidates.length}`)) % candidates.length] || vocabulary[0];
    const hub = document.querySelector('.en-upgrade-hub');
    if (!hub || !reviewEntry) return;
    hub.querySelector('.en-review-prompt').textContent = reviewEntry.term;
    hub.querySelector('.en-review-hint').textContent = `Mức ${estimatedLevel(reviewEntry)} · Hãy nhớ nghĩa trước khi hiện đáp án.`;
    hub.querySelector('.en-review-input').value = '';
    hub.querySelector('.en-review-answer').classList.remove('show');
    hub.querySelector('.en-rating').classList.remove('show');
  };
  const chooseListening = () => {
    const candidates = vocabulary.filter((entry) => entry.example && entry.example.split(' ').length >= 3);
    listeningEntry = candidates[Math.abs(hash(`${Date.now()}:listen`)) % candidates.length] || vocabulary[0];
    const hub = document.querySelector('.en-upgrade-hub');
    if (hub) {
      hub.querySelector('[data-listen-input]').value = '';
      hub.querySelector('.en-listen-feedback').textContent = 'Nhấn Nghe rồi gõ lại câu.';
    }
  };
  const speakText = (text, rate = .86, language = 'en-US') => {
    if (!('speechSynthesis' in window)) return toast('Trình duyệt này không hỗ trợ phát âm.');
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = Number(rate) || .86;
    speechSynthesis.speak(utterance);
  };
  const levenshtein = (left, right) => {
    const a = normalize(left), b = normalize(right);
    const matrix = Array.from({ length: b.length + 1 }, (_, row) => [row]);
    for (let column = 0; column <= a.length; column += 1) matrix[0][column] = column;
    for (let row = 1; row <= b.length; row += 1) for (let column = 1; column <= a.length; column += 1) {
      matrix[row][column] = Math.min(matrix[row - 1][column] + 1, matrix[row][column - 1] + 1, matrix[row - 1][column - 1] + (a[column - 1] === b[row - 1] ? 0 : 1));
    }
    return matrix[b.length][a.length];
  };
  const similarity = (left, right) => {
    const max = Math.max(normalize(left).length, normalize(right).length, 1);
    return Math.max(0, Math.round((1 - levenshtein(left, right) / max) * 100));
  };

  const renderSentenceResult = (analysis) => {
    const tokens = normalize(analysis.corrected).split(' ');
    return `<div class="en-verdict ${analysis.correct ? 'correct' : 'review'}"><span class="en-verdict-icon"></span><span>${analysis.correct ? 'Câu đúng theo các quy tắc đã kiểm tra' : `Phát hiện ${analysis.issues.length} điểm cần sửa`}</span></div>
      ${analysis.correct ? '' : `<div class="en-answer-block"><strong>Câu hoàn chỉnh sau khi sửa</strong><p class="en-corrected">${esc(analysis.corrected)}</p><div class="en-order">${tokens.map((token) => `<span>${esc(token)}</span>`).join('')}</div></div><div class="en-issues">${analysis.issues.map((issue) => `<article class="en-issue"><h4>${esc(issue.type)}</h4><p><code>${esc(issue.wrong)}</code> → <code>${esc(issue.right)}</code></p><p>${esc(issue.reason)}</p>${issue.alternatives?.length > 1 ? `<div class="en-suggestions"><span>Có thể chọn:</span>${issue.alternatives.map((word) => `<button type="button" data-replace-suggestion="${esc(word)}">${esc(word)}</button>`).join('')}</div>` : ''}</article>`).join('')}</div>`}
      <p class="en-disclaimer">${analysis.online ? 'Đã kiểm tra bằng bộ quy tắc chính tả–ngữ pháp mở rộng.' : 'Đang dùng bộ kiểm tra cục bộ vì dịch vụ kiểm tra sâu không khả dụng.'} Câu chuyên ngành hoặc nhiều nghĩa vẫn nên được review. <a href="https://languagetool.org/" target="_blank" rel="noopener">LanguageTool</a></p>`;
  };

  const startPlacement = () => {
    const panel = document.querySelector('[data-tool-panel="placement"]');
    const pool = [
      ...vocabulary.filter((entry) => entry.categories.includes('foundation')).filter((_entry, index) => index % 95 === 0),
      ...vocabulary.filter((entry) => entry.categories.includes('work')).filter((_entry, index) => index % 12 === 0),
      ...vocabulary.filter((entry) => entry.categories.includes('it')).filter((_entry, index) => index % 18 === 0)
    ].filter((entry) => cleanMeaning(entry));
    const questions = makeQuestions(seeded(pool, 'placement-v2').slice(0, 20), 'placement-v2', 20);
    const body = panel.querySelector('[data-placement-body]');
    body.innerHTML = questions.map((question, index) => `<article class="en-question" data-placement-question="${index}" data-answer="${question.answer}"><p>${index + 1}. “${esc(question.entry.term)}” có nghĩa phù hợp nhất là gì?</p><div class="en-options">${question.options.map((option, optionIndex) => `<button type="button" class="en-option" data-placement-option="${optionIndex}">${esc(option)}</button>`).join('')}</div></article>`).join('') + '<button type="button" class="en-primary" data-placement-submit>Chấm bài đầu vào</button>';
    panel.querySelector('[data-placement-start]').hidden = true;
  };
  const refreshProgress = () => {
    const grid = document.querySelector('[data-progress-grid]');
    if (!grid) return;
    const words = parseStore('learnit:english:words');
    const lessons = parseStore('learnit:english:lessons');
    const reviews = srs();
    const quizzes = quizState();
    const due = Object.values(reviews).filter((item) => item.due <= Date.now()).length;
    const passed = Object.values(quizzes).filter((item) => item.passed).length;
    grid.innerHTML = `<article><strong>${Object.values(words).filter((state) => state === 'mastered').length}</strong><span>Từ đã mastered</span></article><article><strong>${Object.values(lessons).filter(Boolean).length}/${meta.lessonCount || 143}</strong><span>Bài hoàn thành</span></article><article><strong>${due}</strong><span>Thẻ đến hạn</span></article><article><strong>${passed}</strong><span>Quiz đã đạt</span></article>`;
  };

  const expandedMeaningCorrections = {
    hello: 'xin chào; lời chào',
    'good-bye': 'tạm biệt; lời chào tạm biệt',
    configure: 'cấu hình; thiết lập các tham số để hệ thống hoạt động',
    automate: 'tự động hóa; làm cho một quy trình chạy tự động',
    troubleshoot: 'chẩn đoán và xử lý sự cố',
    debug: 'gỡ lỗi; tìm và sửa lỗi trong chương trình hoặc hệ thống',
    deployment: 'sự triển khai; quá trình đưa phần mềm vào môi trường chạy',
    rollback: 'hoàn tác; quay lại phiên bản hoặc trạng thái trước',
    monitoring: 'việc giám sát và theo dõi trạng thái hệ thống',
    logging: 'việc ghi nhật ký hoạt động hoặc sự kiện',
    firewall: 'tường lửa; hệ thống kiểm soát lưu lượng mạng',
    vulnerability: 'lỗ hổng bảo mật; điểm yếu có thể bị khai thác',
    exploit: 'khai thác lỗ hổng; mã hoặc kỹ thuật dùng để khai thác',
    container: 'vùng chứa; môi trường đóng gói ứng dụng và phụ thuộc',
    cluster: 'cụm máy hoặc dịch vụ hoạt động cùng nhau',
    pipeline: 'chuỗi bước xử lý tự động; quy trình CI/CD',
    repository: 'kho lưu trữ mã nguồn hoặc gói phần mềm',
    latency: 'độ trễ; thời gian chờ trước khi nhận phản hồi',
    throughput: 'thông lượng; lượng dữ liệu hoặc công việc xử lý trong một đơn vị thời gian',
    availability: 'tính sẵn sàng; khả năng hệ thống duy trì hoạt động'
  };

  const installExpandedDictionary = () => {
    const root = document.querySelector('#learnit-english-root');
    const switcher = root?.querySelector('.en-master-switch');
    const originalPanel = root?.querySelector('[data-en-panel="dictionary"]');
    if (!root || !switcher || !originalPanel || root.querySelector('[data-en-view="expanded"]')) return;

    switcher.querySelector('[data-en-view="dictionary"]')?.insertAdjacentHTML(
      'afterend',
      '<button type="button" data-en-view="favorites">Mục đã đánh dấu ★</button><button type="button" data-en-view="expanded">Từ điển mở rộng 104.938 mục</button>'
    );
    originalPanel.insertAdjacentHTML('afterend', `<section class="en-view en-favorites-dictionary" data-en-panel="favorites">
      <div class="en-dictionary-tools">
        <div class="en-search-line">
          <input type="search" data-favorites-search placeholder="Tìm trong các mục bạn đã đánh dấu sao..." autocomplete="off">
          <span class="en-result-count" data-favorites-count>0 mục đã đánh dấu</span>
        </div>
        <p class="en-expanded-source">Tất cả mục có dấu ★ từ cả từ điển 2.794 và từ điển mở rộng đều xuất hiện tại đây.</p>
      </div>
      <div class="en-expanded-status" data-favorites-status hidden></div>
      <div class="en-dictionary-grid" data-favorites-results></div>
    </section>
    <section class="en-view en-expanded-dictionary" data-en-panel="expanded">
      <div class="en-dictionary-tools">
        <div class="en-search-line">
          <input type="search" data-expanded-search placeholder="Tra hơn 104.000 từ Anh–Việt, phiên âm hoặc nghĩa..." autocomplete="off">
          <button type="button" data-expanded-random>Học 12 từ ngẫu nhiên</button>
          <span class="en-result-count" data-expanded-count>Chưa tải dữ liệu</span>
        </div>
        <p class="en-expanded-source">Bộ tra cứu riêng, chỉ tải khi mở · Nguồn: <a href="https://dictionarymid.sourceforge.net/dictionaries/dictsVietnameese.html" target="_blank" rel="noopener">Free Vietnamese Dictionary Project / DictionaryForMIDs</a>.</p>
      </div>
      <div class="en-expanded-status" data-expanded-status>Nhấn “Từ điển mở rộng” để nạp dữ liệu.</div>
      <div class="en-dictionary-grid" data-expanded-results></div>
      <button type="button" class="en-more" data-expanded-more hidden>Xem thêm</button>
    </section>`);

    const panel = root.querySelector('[data-en-panel="expanded"]');
    const favoritesPanel = root.querySelector('[data-en-panel="favorites"]');
    const results = panel.querySelector('[data-expanded-results]');
    const status = panel.querySelector('[data-expanded-status]');
    const count = panel.querySelector('[data-expanded-count]');
    const search = panel.querySelector('[data-expanded-search]');
    const more = panel.querySelector('[data-expanded-more]');
    const favoritesResults = favoritesPanel.querySelector('[data-favorites-results]');
    const favoritesStatus = favoritesPanel.querySelector('[data-favorites-status]');
    const favoritesCount = favoritesPanel.querySelector('[data-favorites-count]');
    const favoritesSearch = favoritesPanel.querySelector('[data-favorites-search]');
    let entries = null;
    let visible = 60;
    let filtered = [];
    let randomEntries = null;
    let loading = null;
    let searchTimer = 0;

    const states = () => parseStore(STORE.expandedStates);
    const stateOf = (id) => states()[id] || 'new';
    const statusLabel = (value) => value === 'learning' ? '◐ Đang học' : value === 'mastered' ? '● Mastered' : '○ Mới';
    const matches = (entry, query) => {
      if (!query) return true;
      const term = normalize(entry.t);
      const compactTerm = term.replaceAll(' ', '');
      const preferred = expandedMeaningCorrections[term] || vocabByTerm.get(term)?.meaning || '';
      if (term === query || compactTerm === query.replaceAll(' ', '') || term.startsWith(query) || term.includes(query)) return true;
      return normalize(preferred).includes(query) || entry.m.some((meaning) => normalize(meaning).includes(query));
    };
    const card = (entry, index, total) => {
      const favorites = parseStore(STORE.favorites);
      const value = stateOf(entry.i);
      const normalizedTerm = normalize(entry.t);
      const preferred = expandedMeaningCorrections[normalizedTerm] || vocabByTerm.get(normalizedTerm)?.meaning || '';
      const meanings = preferred
        ? [preferred, ...entry.m.filter((meaning) => normalize(meaning) !== normalize(preferred))]
        : entry.m;
      const firstMeanings = meanings.slice(0, 4);
      const remaining = meanings.slice(4);
      return `<article class="en-card en-expanded-card ${value}" data-en-meta="1">
        <div class="en-card-head">
          <small>${preferred ? 'Nghĩa chuẩn hóa · ' : 'Từ điển mở rộng · '}${entry.o?.length ? esc(entry.o.join(' / ')) : 'Anh–Việt'}</small>
          <h3>${esc(entry.t)}</h3>
          <div class="en-card-controls">
            <button type="button" class="en-favorite ${favorites[entry.i] ? 'active' : ''}" data-expanded-favorite="${entry.i}" aria-label="${favorites[entry.i] ? 'Bỏ đánh dấu' : 'Đánh dấu từ này'}" title="${favorites[entry.i] ? 'Bỏ đánh dấu' : 'Đánh dấu từ này'}">★</button>
            <button type="button" class="en-speak" data-expanded-speak="${entry.i}" aria-label="Phát âm ${esc(entry.t)}" title="Phát âm">◖))</button>
          </div>
        </div>
        ${entry.p ? `<p class="en-expanded-phonetic">/${esc(entry.p)}/</p>` : ''}
        <ul class="en-expanded-meanings">${firstMeanings.map((meaning) => `<li>${esc(meaning)}</li>`).join('')}</ul>
        ${remaining.length ? `<details class="en-expanded-more-meanings"><summary>Xem thêm ${remaining.length} nghĩa</summary><ul>${remaining.map((meaning) => `<li>${esc(meaning)}</li>`).join('')}</ul></details>` : ''}
        <footer><small class="en-entry-counter">${String(index + 1).padStart(6, '0')} / ${total.toLocaleString('vi-VN')}</small><button type="button" class="en-state ${value}" data-expanded-state="${entry.i}">${statusLabel(value)}</button></footer>
      </article>`;
    };
    const render = () => {
      if (!entries) return;
      const list = randomEntries || filtered;
      const page = list.slice(0, visible);
      count.textContent = randomEntries ? 'Bộ luyện 12 từ' : `${list.length.toLocaleString('vi-VN')} kết quả`;
      results.innerHTML = page.length
        ? page.map((entry, index) => card(entry, index, list.length)).join('')
        : '<p class="en-empty">Không tìm thấy từ phù hợp trong bộ mở rộng.</p>';
      more.hidden = page.length >= list.length || Boolean(randomEntries);
      status.hidden = true;
    };
    const applySearch = () => {
      if (!entries) return;
      randomEntries = null;
      visible = 60;
      const query = normalize(search.value.trim());
      status.hidden = false;
      status.textContent = query ? 'Đang tìm trong 104.938 mục…' : 'Đang chuẩn bị danh sách…';
      requestAnimationFrame(() => {
        filtered = query ? entries.filter((entry) => matches(entry, query)) : entries;
        render();
      });
    };
    const load = () => {
      if (entries) return Promise.resolve(entries);
      if (loading) return loading;
      status.hidden = false;
      status.innerHTML = '<span class="en-expanded-spinner"></span>Đang nạp từ điển mở rộng lần đầu…';
      count.textContent = 'Đang tải…';
      loading = fetch('./english-expanded-dictionary-v2.json', { cache: 'force-cache' })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then((payload) => {
          entries = payload.entries || [];
          filtered = entries;
          count.textContent = `${entries.length.toLocaleString('vi-VN')} kết quả`;
          render();
          return entries;
        })
        .catch(() => {
          loading = null;
          count.textContent = 'Không tải được';
          status.innerHTML = 'Không thể nạp bộ mở rộng. <button type="button" data-expanded-retry>Thử lại</button>';
          throw new Error('Expanded dictionary failed to load');
        });
      return loading;
    };

    const originalFavoriteCard = (entry, index, total) => {
      const favorites = parseStore(STORE.favorites);
      const wordStates = parseStore('learnit:english:words');
      const value = wordStates[entry.id] || 'new';
      return `<article class="en-card en-favorite-card ${value}" data-en-meta="1">
        <div class="en-card-head">
          <small>Từ điển 2.794 · ${esc(entry.categories.map((item) => item === 'foundation' ? 'Nền tảng' : item === 'daily' ? 'Giao tiếp' : item === 'work' ? 'Công việc' : item === 'it' ? 'IT / DevOps' : item === 'gaming' ? 'Gaming' : 'Giáo trình').join(' / '))}</small>
          <h3>${esc(entry.term)}</h3>
          <div class="en-card-controls">
            <button type="button" class="en-favorite ${favorites[entry.id] ? 'active' : ''}" data-en-favorite="${entry.id}" aria-label="Bỏ đánh dấu" title="Bỏ đánh dấu">★</button>
            <button type="button" class="en-speak" data-en-speak="${entry.id}" aria-label="Phát âm ${esc(entry.term)}" title="Phát âm">◖))</button>
          </div>
        </div>
        <p>${esc(entry.meaning)}</p>
        ${entry.example ? `<blockquote>${esc(entry.example)}</blockquote>` : ''}
        <footer><small class="en-entry-counter">${String(index + 1).padStart(4, '0')} / ${total.toLocaleString('vi-VN')}</small><button type="button" class="en-state ${value}" data-en-state="${entry.id}">${statusLabel(value)}</button></footer>
      </article>`;
    };
    const renderFavorites = async () => {
      const favorites = parseStore(STORE.favorites);
      const ids = Object.keys(favorites).filter((id) => favorites[id]);
      const expandedIds = ids.filter((id) => id.startsWith('ex-'));
      if (expandedIds.length && !entries) {
        favoritesStatus.hidden = false;
        favoritesStatus.innerHTML = '<span class="en-expanded-spinner"></span>Đang nạp các mục đã đánh dấu từ bộ mở rộng…';
        try { await load(); } catch (_error) {
          favoritesStatus.innerHTML = 'Không thể nạp các mục thuộc từ điển mở rộng.';
        }
      }
      const query = normalize(favoritesSearch.value.trim());
      const originalItems = vocabulary.filter((entry) => favorites[entry.id] && (!query || normalize(`${entry.term} ${entry.meaning} ${entry.example}`).includes(query)));
      const expandedItems = (entries || []).filter((entry) => favorites[entry.i] && (!query || matches(entry, query)));
      const total = originalItems.length + expandedItems.length;
      favoritesCount.textContent = `${total.toLocaleString('vi-VN')} mục đã đánh dấu`;
      favoritesResults.innerHTML = total
        ? [
            ...originalItems.map((entry, index) => originalFavoriteCard(entry, index, total)),
            ...expandedItems.map((entry, index) => card(entry, originalItems.length + index, total))
          ].join('')
        : '<div class="en-favorites-empty"><span>☆</span><h3>Chưa có mục được đánh dấu</h3><p>Nhấn biểu tượng sao trên bất kỳ thẻ từ nào; mục đó sẽ tự động xuất hiện tại đây.</p></div>';
      favoritesStatus.hidden = true;
    };

    root.addEventListener('click', (event) => {
      if (event.target.closest('[data-en-view="favorites"]')) renderFavorites();
      if (event.target.closest('[data-en-view="expanded"]')) load().catch(() => {});
      if (event.target.closest('[data-expanded-retry]')) load().catch(() => {});
      if (event.target.closest('[data-expanded-more]')) {
        visible += 60;
        render();
      }
      if (event.target.closest('[data-expanded-random]')) load().then(() => {
        randomEntries = [...entries].sort(() => Math.random() - .5).slice(0, 12);
        search.value = '';
        visible = 12;
        render();
      }).catch(() => {});
      const speakButton = event.target.closest('[data-expanded-speak]');
      if (speakButton && entries) {
        const entry = entries.find((item) => item.i === speakButton.dataset.expandedSpeak);
        if (entry && 'speechSynthesis' in window) {
          speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(entry.t);
          utterance.lang = 'en-US';
          utterance.rate = .86;
          speechSynthesis.speak(utterance);
        }
      }
      const favoriteButton = event.target.closest('[data-expanded-favorite]');
      if (favoriteButton) {
        const favorites = parseStore(STORE.favorites);
        const id = favoriteButton.dataset.expandedFavorite;
        favorites[id] = !favorites[id];
        if (!favorites[id]) delete favorites[id];
        writeStore(STORE.favorites, favorites);
        favoriteButton.classList.toggle('active', Boolean(favorites[id]));
        favoriteButton.setAttribute('aria-label', favorites[id] ? 'Bỏ đánh dấu' : 'Đánh dấu từ này');
        favoriteButton.title = favorites[id] ? 'Bỏ đánh dấu' : 'Đánh dấu từ này';
        if (favoritesPanel.classList.contains('active')) setTimeout(renderFavorites);
      }
      if (event.target.closest('[data-en-favorite]') && favoritesPanel.classList.contains('active')) setTimeout(renderFavorites);
      const stateButton = event.target.closest('[data-expanded-state]');
      if (stateButton) {
        const data = states();
        const id = stateButton.dataset.expandedState;
        data[id] = { new: 'learning', learning: 'mastered', mastered: 'new' }[data[id] || 'new'];
        writeStore(STORE.expandedStates, data);
        favoritesPanel.classList.contains('active') ? renderFavorites() : render();
      }
      if (event.target.closest('[data-en-state]') && favoritesPanel.classList.contains('active')) setTimeout(renderFavorites);
    });
    search.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => load().then(applySearch).catch(() => {}), 180);
    });
    favoritesSearch.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(renderFavorites, 140);
    });
  };

  const installHub = () => {
    const root = document.querySelector('#learnit-english-root');
    const switcher = root?.querySelector('.en-master-switch');
    if (!root || !switcher || root.querySelector('.en-upgrade-hub')) return;
    switcher.insertAdjacentHTML('afterend', hubMarkup());
    const categoryBar = root.querySelector('#en-category');
    const gamingFilter = categoryBar?.querySelector('[data-en-category="gaming"]');
    if (categoryBar && gamingFilter) categoryBar.append(gamingFilter);
    const courseSwitch = root.querySelector('[data-en-view="course"]');
    if (courseSwitch) courseSwitch.textContent = `Giáo trình ${meta.lessonCount || 143} bài`;
    root.querySelector('.en-course-nav>h3').textContent = `${modules.length} module`;
    chooseReview();
    chooseListening();
    refreshProgress();
  };

  document.addEventListener('DOMContentLoaded', () => {
    installHub();
    installExpandedDictionary();
    renderQuiz();
    decorateVocabulary();
    const lessonRoot = document.querySelector('#en-lesson');
    const root = document.querySelector('#learnit-english-root');
    const observer = new MutationObserver(() => {
      renderQuiz();
      decorateVocabulary(root);
      refreshProgress();
    });
    if (lessonRoot) observer.observe(lessonRoot, { childList: true, subtree: true });
    const results = document.querySelector('#en-results');
    if (results) observer.observe(results, { childList: true, subtree: true });

    document.addEventListener('click', (event) => {
      const complete = event.target.closest('#en-complete');
      if (complete && !quizPassed(currentLessonKey())) {
        event.preventDefault();
        event.stopImmediatePropagation();
        document.querySelector('[data-upgrade-quiz]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        toast('Hãy đạt ít nhất 4/5 câu quiz trước khi hoàn thành bài.');
      }
    }, true);

    root?.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-tool]');
      if (tab) {
        root.querySelectorAll('[data-tool]').forEach((button) => button.classList.toggle('active', button === tab));
        root.querySelectorAll('[data-tool-panel]').forEach((panel) => panel.classList.toggle('active', panel.dataset.toolPanel === tab.dataset.tool));
        if (tab.dataset.tool === 'progress') refreshProgress();
        return;
      }
      if (event.target.closest('[data-sentence-example]')) root.querySelector('.en-sentence-input').value = 'Why you are restart a server?';
      if (event.target.closest('[data-analyze-sentence]')) {
        const input = root.querySelector('.en-sentence-input').value.trim();
        if (!input) return toast('Hãy nhập một câu tiếng Anh.');
        const result = root.querySelector('[data-sentence-result]');
        result.classList.remove('empty');
        const button = event.target.closest('[data-analyze-sentence]');
        button.disabled = true;
        button.textContent = 'Đang kiểm tra chính tả và ngữ pháp…';
        result.innerHTML = '<div class="en-checking"><span></span>Đang đối chiếu từ sai, trật tự từ và cấu trúc câu…</div>';
        analyzeSentenceAdvanced(input).then((analysis) => {
          result.innerHTML = renderSentenceResult(analysis);
          const translation = root.querySelector('[data-sentence-translation]');
          translation.querySelector('p').textContent = analysis.translation.text;
          translation.querySelector('[data-translation-note]').textContent = analysis.translation.online
            ? 'Đã dịch theo ngữ cảnh của toàn câu.'
            : 'Đang dùng bản dịch cục bộ dự phòng.';
          translation.hidden = false;
        }).finally(() => {
          button.disabled = false;
          button.textContent = 'Kiểm tra và sửa câu';
        });
      }
      const suggestion = event.target.closest('[data-replace-suggestion]');
      if (suggestion) {
        const input = root.querySelector('.en-sentence-input');
        const issue = suggestion.closest('.en-issue');
        const wrong = issue?.querySelector('code')?.textContent || '';
        input.value = input.value.replace(new RegExp(`\\b${wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), suggestion.dataset.replaceSuggestion);
        root.querySelector('[data-analyze-sentence]').click();
      }
      const stateButton = event.target.closest('.en-state');
      if (stateButton) scheduleWord(stateButton.dataset.enState, 2);
      const favoriteButton = event.target.closest('[data-en-favorite]');
      if (favoriteButton) {
        const favorites = parseStore(STORE.favorites);
        const id = favoriteButton.dataset.enFavorite;
        favorites[id] = !favorites[id];
        if (!favorites[id]) delete favorites[id];
        writeStore(STORE.favorites, favorites);
        favoriteButton.classList.toggle('active', Boolean(favorites[id]));
        favoriteButton.setAttribute('aria-label', favorites[id] ? 'Bỏ đánh dấu' : 'Đánh dấu từ này');
        favoriteButton.title = favorites[id] ? 'Bỏ đánh dấu' : 'Đánh dấu từ này';
        toast(favorites[id] ? 'Đã đánh dấu từ này.' : 'Đã bỏ đánh dấu.');
      }
      if (event.target.closest('[data-review-reveal]')) {
        root.querySelector('.en-review-answer').innerHTML = `<strong>${esc(reviewEntry.term)}</strong><p>${esc(reviewEntry.meaning)}</p>${reviewEntry.example ? `<p>${esc(reviewEntry.example)}</p>` : ''}`;
        root.querySelector('.en-review-answer').classList.add('show');
        root.querySelector('.en-rating').classList.add('show');
      }
      if (event.target.closest('[data-review-check]')) {
        const answer = root.querySelector('.en-review-input').value;
        const accepted = normalize(reviewEntry.meaning).split(' ').some((word) => word.length > 3 && normalize(answer).includes(word));
        root.querySelector('.en-review-answer').innerHTML = `<strong>${accepted ? '✓ Có ý đúng' : 'Cần ôn lại'}</strong><p>${esc(reviewEntry.meaning)}</p>${reviewEntry.example ? `<p>${esc(reviewEntry.example)}</p>` : ''}`;
        root.querySelector('.en-review-answer').classList.add('show');
        root.querySelector('.en-rating').classList.add('show');
      }
      const rate = event.target.closest('[data-rate]');
      if (rate) { scheduleWord(reviewEntry.id, Number(rate.dataset.rate)); chooseReview(); refreshProgress(); }
      if (event.target.closest('[data-listen-play]')) speakText(listeningEntry.example || listeningEntry.term, root.querySelector('[data-listen-rate]').value);
      if (event.target.closest('[data-listen-new]')) chooseListening();
      if (event.target.closest('[data-listen-check]')) {
        const target = listeningEntry.example || listeningEntry.term;
        const answer = root.querySelector('[data-listen-input]').value;
        const score = similarity(answer, target);
        root.querySelector('.en-listen-feedback').innerHTML = `${score >= 90 ? '✓' : '○'} Chính xác ${score}%${score < 90 ? ` · Câu đúng: <strong>${esc(target)}</strong>` : ''}`;
      }
      if (event.target.closest('[data-pronounce-model]')) speakText(root.querySelector('.en-pronounce-target').value, .86);
      if (event.target.closest('[data-pronounce-record]')) {
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Recognition) return toast('Trình duyệt này chưa hỗ trợ nhận diện giọng nói. Hãy dùng Chrome hoặc Edge.');
        const recognition = new Recognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        root.querySelector('.en-pronounce-feedback').textContent = 'Đang nghe… hãy nói câu mẫu.';
        recognition.onresult = (result) => {
          const heard = result.results[0][0].transcript;
          const target = root.querySelector('.en-pronounce-target').value;
          const score = similarity(heard, target);
          root.querySelector('.en-pronounce-feedback').innerHTML = `Nghe được: <strong>${esc(heard)}</strong> · Khớp nội dung ${score}%`;
        };
        recognition.onerror = () => { root.querySelector('.en-pronounce-feedback').textContent = 'Không nhận được giọng nói. Kiểm tra quyền microphone và thử lại.'; };
        recognition.start();
      }
      if (event.target.closest('[data-placement-start]')) startPlacement();
      const placementOption = event.target.closest('[data-placement-option]');
      if (placementOption) {
        const question = placementOption.closest('[data-placement-question]');
        question.querySelectorAll('.en-option').forEach((button) => button.classList.remove('selected'));
        placementOption.classList.add('selected');
        question.dataset.selected = placementOption.dataset.placementOption;
      }
      if (event.target.closest('[data-placement-submit]')) {
        const questions = [...root.querySelectorAll('[data-placement-question]')];
        const correct = questions.filter((question) => Number(question.dataset.selected) === Number(question.dataset.answer)).length;
        const level = correct <= 5 ? 'A1' : correct <= 9 ? 'A2' : correct <= 13 ? 'B1' : correct <= 17 ? 'B2' : 'C1 định hướng IT';
        const result = { correct, total: questions.length, level, at: new Date().toISOString() };
        writeStore(STORE.placement, result);
        root.querySelector('.en-placement-feedback').innerHTML = `<strong>${correct}/${questions.length} · Mức ước lượng ${level}</strong><br>Đây là sàng lọc nhanh từ vựng; hãy kết hợp bài nghe, nói, đọc và viết để xác định chính xác.`;
        questions.forEach((question) => question.querySelectorAll('.en-option').forEach((button) => {
          button.classList.toggle('correct', Number(button.dataset.placementOption) === Number(question.dataset.answer));
          button.classList.toggle('wrong', button.classList.contains('selected') && Number(button.dataset.placementOption) !== Number(question.dataset.answer));
        }));
      }
      if (event.target.closest('[data-export-progress]')) {
        const payload = {};
        Object.keys(localStorage).filter((key) => key.startsWith('learnit:english')).forEach((key) => { payload[key] = localStorage.getItem(key); });
        const blob = new Blob([JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), data: payload }, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `learnit-english-progress-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
      }
      if (event.target.closest('[data-import-progress]')) root.querySelector('.en-import').click();
    });
    root?.querySelector('.en-import')?.addEventListener('change', async (event) => {
      try {
        const payload = JSON.parse(await event.target.files[0].text());
        Object.entries(payload.data || {}).filter(([key]) => key.startsWith('learnit:english')).forEach(([key, value]) => localStorage.setItem(key, value));
        toast('Đã nhập tiến độ. Trang sẽ tải lại.');
        setTimeout(() => location.reload(), 900);
      } catch (_error) { toast('File tiến độ không hợp lệ.'); }
    });
  });
})();

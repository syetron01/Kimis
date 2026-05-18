require('dotenv').config();
const { extractKeywords } = require('../utils/nlp');
const { retrieveArticles, retrieveWorkflowNodes, rankResults } = require('../services/aiRetrievalService');
const { buildContext } = require('../services/contextBuilderService');
const { generateGroundedAnswer, computeConfidence } = require('../services/geminiService');

const WORKSPACE_ID = 3; // the workspace from the logs
const TEST_QUERY   = 'How do I reset a password?';

async function runTest() {
    try {
        console.log('=== Step 1: Keywords ===');
        const keywords = extractKeywords(TEST_QUERY);
        console.log('Keywords:', keywords);

        console.log('\n=== Step 2: Retrieve Articles ===');
        const articles = await retrieveArticles(WORKSPACE_ID, keywords);
        console.log('Articles found:', articles.length);
        articles.forEach(a => console.log(`  - [${a.score}] ${a.title}`));

        console.log('\n=== Step 3: Retrieve Workflow Nodes ===');
        const nodes = await retrieveWorkflowNodes(WORKSPACE_ID, keywords);
        console.log('Nodes found:', nodes.length);
        nodes.forEach(n => console.log(`  - [${n.score}] ${n.title} (wf: ${n.workflow_title})`));

        console.log('\n=== Step 4: Rank ===');
        const ranked = await rankResults(articles, nodes, 5);
        console.log('Ranked results:', ranked.length);

        console.log('\n=== Step 5: Build Context ===');
        const { contextText, sources, workflow } = buildContext(TEST_QUERY, ranked);
        console.log('Context snippet:', contextText.substring(0, 300));
        console.log('Sources:', sources);
        console.log('Workflow:', workflow);

        console.log('\n=== Step 6: Gemini ===');
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
            console.log('GEMINI_API_KEY not set — skipping Gemini call.');
        } else {
            const answer = await generateGroundedAnswer(contextText);
            console.log('Answer:', answer.substring(0, 400));
        }

        console.log('\n=== ALL STEPS PASSED ===');
    } catch (err) {
        console.error('\n!!! PIPELINE ERROR !!!');
        console.error('Message:', err.message);
        console.error('Stack:', err.stack);
    } finally {
        const pool = require('../config/db');
        await pool.end();
    }
}

runTest();

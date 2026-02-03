require('dotenv').config();
const axios = require('axios');

const token = process.env.GITHUB_TOKEN;
const repo = 'timeriver/sacsys009';
const [owner, name] = repo.split('/');

const githubGraphQLClient = axios.create({
  baseURL: 'https://api.github.com/graphql',
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
  },
});

const query = `
  query {
    repository(owner: "${owner}", name: "${name}") {
      issues(first: 20, states: OPEN, orderBy: {field: UPDATED_AT, direction: DESC}) {
        nodes {
          number
          title
          assignees(first: 5) {
            nodes {
              login
            }
          }
          labels(first: 20) {
            nodes {
              name
            }
          }
        }
      }
    }
  }
`;

async function debug() {
  try {
    const response = await githubGraphQLClient.post('', { query });
    const issues = response.data.data.repository.issues.nodes;
    console.log(`--- Labels and Assignees for ${repo} ---`);
    issues.forEach(issue => {
      const labels = issue.labels.nodes.map(l => l.name);
      const assignees = issue.assignees.nodes.map(a => a.login);
      console.log(`#${issue.number}: ${issue.title} [${assignees.join(', ')}]`);
      console.log(`   Labels: [${labels.join(', ')}]`);
    });
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

debug();

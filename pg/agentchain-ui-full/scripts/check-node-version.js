const major = Number(process.versions.node.split('.')[0]);

if (major < 18 || major >= 21) {
  console.error(`AgentChain UI uses Angular 17 and must run on Node 18 or 20. Current Node is ${process.version}.`);
  console.error('Install/use Node 20 LTS, then rerun npm start.');
  process.exit(1);
}

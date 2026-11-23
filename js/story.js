/* Voxelstad — the story: five days, one night, and how it ends */
(function () {
  const St = (G.Story = {}), UI = G.UI, Gm = G.Game, W = G.World, LOC = W.LOC;
  const say = UI.say, choose = UI.choose;
  let S;
  const TITLES = { 1: 'Paper town', 2: 'The first cable', 3: 'The offer', 4: 'The price of convenience', 5: 'Open Town Day' };
  const BLURBS = {
    1: 'Your first morning. The systems are off and the queue is already forming.',
    2: 'Whatever you funded last night is live. Two more desks open today: permits and care.',
    3: 'Passport season. Two visitors are on their way to the square, each with a plan for your town.',
    4: 'A storm is coming in off the polder, and a letter has arrived from Monolith.',
    5: 'Half the province is visiting. Tonight the council votes on your term.',
  };

  async function intro() {
    await UI.card('Voxelstad · population 48 200', 'One canal. One windmill. One server room.', 'Three weeks ago, ransomware took the server room. The mayor resigned. The town has run on paper, patience and a fax machine ever since.');
    await UI.card('This morning', 'The council elected you.', 'Five days until the vote of confidence. Serve the town by hand, then decide what to build so that nobody has to again. And who should own it.', 'Take office');
  }

  /* ---------- mornings ---------- */
  const morning = {
    1: async () => {
      const han = G.spawnNPC(G.LOOKS.hanneke, 1.5, -4.5); han.face = G.player; G.player.faceTo = han;
      await say('hanneke', 'Mayor. Hanneke Brouwer, municipal secretary. I would shake your hand, but I am holding forty passport applications.');
      await say('hanneke', 'The servers have been dark since the attack. So today we work the way my grandmother did: on foot. You should feel that before you decide anything.');
      const c = await choose('hanneke', 'Shall I walk you through a morning at the counter?', [{ t: 'Show me the ropes' }, { t: 'I know the drill. Open the doors.', note: 'skip the tutorial' }]);
      if (c === 0) await tutorial();
      await say('hanneke', 'Counter is open until five. Fatima takes a window when she can. The rest of the queue is yours, Mayor.');
      han.face = null; han.walk([LOC.hallDoor], () => han.remove());
    },
    2: async () => {
      await say('hanneke', 'Two more desks land on you today. Building permits: take the plans to the Planning office out east, wait for the review, bring the decision back.');
      await say('hanneke', 'And social support. You go to people\'s homes and you listen. Then you file it at the Social office, south of the avenue.');
      await say('hanneke', 'Start with Mevrouw De Wit on the Westkade, across the canal. She asked for you personally.');
      const j = Gm.spawnCare(0);
      if (j) j.steps[0].on = async () => {
        await say('dewit', 'Forty years behind the post office counter, me. Now everything says "log in". I do not have one of those phones, Mayor.');
        await choose('dewit', 'When my card runs out, will there still be a person I can talk to?', [{ t: 'There will be. I promise.' }, { t: 'We will make it easy enough for everyone.' }]).then((k) => { S.flags.promise = k === 0; });
        S.flags.metDeWit = true;
      };
    },
    3: async () => {
      await say('hanneke', 'Bad news: it is passport season. Everyone who renewed ten years ago is back this week. Expect the queue to double.');
      S.mods.doc = 1.6;
    },
    4: async () => {
      if (Gm.monoCount() || S.flags.exclusive) {
        S.feeMult = 2;
        await say('sterling', 'Dear valued partner. Monolith is evolving its licensing to deliver even more value. Your daily subscription doubles, effective today. Warm regards, Victor.');
        await say('hanneke', Gm.monoCount() ? 'Clause fourteen-b. They can. I checked twice.' : 'We rent nothing from them yet. But everything we are allowed to buy just doubled in price.');
      } else await say('hanneke', 'Dijkveen\'s treasurer forwarded me a letter. Monolith doubled every customer\'s fee overnight. Not ours. We do not have any.');
      await say('bram', 'Storm coming in off the polder, Mayor. Branches, flooding, bins all over the street. Roads and waste will be double today.');
      S.mods.road = 2; S.mods.bin = 1.6; S.storm = 0.8; W.setTime(0, 0.8);
    },
    5: async () => {
      await say('hanneke', 'Open Town Day. Half the province is coming to see how Voxelstad runs. Tonight the council votes on your term.');
      const dis = Object.keys(S.disabled);
      if (dis.length) await say('hanneke', 'The desks that were encrypted are back on paper today. We will manage. We did before.');
      if (S.monoDown) { await say('hanneke', 'And Monolith\'s services are dark until their "security review" is done. Midday, they say.');
        G.until(() => S.day === 5 && S.phase === 'day' && S.time > S.monoDown).then(() => UI.toast('Monolith closed ticket #48213. Their services are back online.', 'note')); }
      await say('hanneke', 'Whatever happens tonight: it was a pleasure, Mayor. Doors open.');
    },
  };

  async function tutorial() {
    UI.toast('<b>W A S D</b> to walk · move the mouse to look · hold <b>E</b> to interact', 'note');
    const j = Gm.spawnDoc({ manual: true, frozen: true });
    UI.setObjective('Go to the counter and take the application', j.spot);
    await G.until(() => j.i >= 1 || S.jobs.indexOf(j) < 0);
    await say('hanneke', 'Now the record. The civil register lives in the Archive, across the square. In boxes. Alphabetical, mostly.');
    UI.setObjective('Carry the form to the Archive', LOC.archive);
    await G.until(() => j.i >= 2 || S.jobs.indexOf(j) < 0);
    UI.setObjective('Bring the document back to the counter', j.spot);
    await G.until(() => S.jobs.indexOf(j) < 0);
    await say('hanneke', 'One down. That took you a minute. There are forty-eight thousand of us.');
    await say('bram', 'Bram, public works. Bins on the square are full, Mayor. Grab a bag and carry it to the depot out east. Or take the truck from the yard, if you can handle her.');
    const bin = S.bins[1]; bin.fill = 1; const base = S.d.manual;
    await G.until(() => { const carrying = S.inv.some((i) => i.type === 'bag') || S.truck.load > 0; UI.setObjective(carrying ? 'Unload the waste at the depot' : 'Empty the full bin on the square (or fetch the truck)', carrying ? LOC.depotDump : S.inTruck ? bin : G.dist(G.player, bin) < 40 && bin.fill > 0.3 ? bin : S.bins.find((b) => b.fill > 0.3) || bin); return S.d.manual > base; });
    await say('bram', 'While you are out there: someone hit a pothole on the east road. We only ever hear about them when people complain.');
    const ph = Gm.spawnPothole({ x: 24.6, z: 8 }, { known: true, frozen: true });
    UI.setObjective('Repair the pothole on the east road', ph);
    await G.until(() => S.potholes.indexOf(ph) < 0);
    UI.setObjective(null);
    await say('hanneke', 'That is the job. Now picture doing it for everyone at once.');
  }

  /* ---------- evenings ---------- */
  const first = (who) => G.CAST[who].name.split(' ')[0];
  async function evening(talks) {
    Gm.startEvening(talks);
    UI.toast('Evening. No queue, no clock. Talk to people, visit the Lab, then end the day at the Town Hall door.', 'note');
    await G.until(() => {
      const need = S.talks.filter((t) => t.need && !t.done);
      if (need.length) UI.setObjective(need[0].label || `Talk to ${first(need[0].who)}`, need[0].pos); else UI.setObjective(S.labOpened ? 'End the day at the Town Hall door when you are ready' : 'Invest at the Lab terminal', S.labOpened ? LOC.hallDoor : LOC.lab);
      return S.eveningDone;
    });
    UI.setObjective(null);
  }
  const P_JORIS = { x: 18.2, z: -13.2 }, P_HAN = { x: 2.5, z: -8.5 }, P_FAT = { x: -4, z: -8.6 }, P_STER = { x: 8, z: 2.5 }, P_INES = { x: -4, z: 1 }, P_BRAM = { x: 37.5, z: 1.5 };
  const evenings = {
    1: () => evening([
      { who: 'joris', pos: P_JORIS, need: true, fn: async () => {
        await say('joris', 'You found the Lab. It is a shipping container. The real server room is a crime scene.');
        await say('joris', 'I am Joris. IT department. All of it.');
        await say('joris', `I can rebuild this town's systems. Proper ones: open standards, our own keys, backups that actually restore. But it costs, and you have ${G.eur(S.budget)}.`);
        await say('joris', 'The terminal is on the wall. Everything you fund takes a chore off your hands tomorrow. Spend the time you win on whatever is left. That is the whole trick.');
        await say('joris', 'Start with the wallet if the counter is drowning. The data exchange if you are sick of walking to the Archive. Or buy a cargo bike. I am not judging.');
      } },
      { who: 'hanneke', pos: P_HAN, fn: async () => {
        await say('hanneke', 'The national grant follows the trust figure. Happy residents, bigger cheque. Unhappy residents, and the province starts asking questions.');
        await say('hanneke', 'Whatever you fund tonight goes live in the morning. Choose what hurt most today.');
      } },
      { who: 'bram', pos: P_BRAM, fn: async () => {
        await say('bram', 'Tip from the yard, Mayor. Roll the truck past bins slowly and she loads them herself. Ten to a run. Then back here to tip.');
        await say('bram', 'Potholes are worse. I have no idea where they are until somebody breaks an axle and phones the paper.');
      } },
    ]),
    2: () => evening([
      { who: 'fatima', pos: P_FAT, need: true, fn: async () => {
        await say('fatima', 'Mayor. Finance was by. They say once the wallet and the kiosk are in, my counter is "legacy". They want it closed. Four thousand a day saved.');
        await say('fatima', 'Today I had a gentleman who cannot read. Last week a woman who must not be findable in any system, by anyone. The kiosk does not do those.');
        const c = await choose('fatima', 'So. Do I keep a window open?', [{ t: 'Keep the counter staffed', note: '−€4k a day · Fatima keeps serving' }, { t: 'Go digital only', note: 'saves the money · no more help at the counter' }]);
        S.flags.counter = c === 0;
        await say('fatima', c === 0 ? 'Thank you. I will keep a window open for as long as anyone needs one.' : 'Understood. I will put up a sign with the web address.');
      } },
      { who: 'sterling', pos: P_STER, need: true, fn: async () => {
        await say('sterling', 'Victor Sterling, Monolith Systems. Congratulations on the appointment, Mayor. Terrible business, that attack.');
        await say('sterling', 'I will be brief. Your sysadmin wants to build you a bicycle. Admirable. I am offering a limousine, with a driver.');
        await say('sterling', 'Identity, data, workplace, AI. A fraction of the upfront cost, live overnight, and a modest daily subscription. Every town in the province is on it.');
        await say('sterling', 'No need to decide tonight. I have had our products added to your terminal. Call it a test drive.');
        S.flags.metSterling = true; UI.toast('Monolith products are now on offer at the Lab terminal.', 'note');
      } },
      { who: 'joris', pos: P_JORIS, fn: async () => {
        await say('joris', 'Monolith was here, wasn\'t he. Black car, white teeth.');
        await say('joris', 'Look, their stuff works. That is not the problem. The problem is the day you want to leave, or they change the price, or the terms. Then it is their town, not ours.');
        await say('joris', 'Open builds cost more tonight. Tomorrow they cost nothing, and nobody can switch them off.');
      } },
    ]),
    3: () => evening([
      { who: 'ines', pos: P_INES, need: true, fn: async () => {
        await say('ines', 'Ines Vermeer. I run Dijkveen, one polder over. We had your attack last year. Same crew.');
        await say('ines', 'Five towns now share one stack. The same open code, one cloud co-operative we own together, one security team that picks up the phone at night. We call it the Commons.');
        await say('ines', 'Join and you get our code and our people. We get yours. Open builds come a quarter cheaper, because you stop paying to invent what Dijkveen already has.');
        await say('ines', 'It is not free. You contribute, you show up. But nobody can triple your bill or switch you off.');
        S.flags.metInes = true;
      } },
      { who: 'sterling', pos: P_STER, need: true, fn: async () => {
        await say('sterling', 'I hear Dijkveen dropped by with their co-operative. Charming. Very artisanal.');
        await say('sterling', 'Let me make this simple. An exclusive partnership. Eighty thousand signing bonus, in your account tonight. In return, Voxelstad standardises on Monolith. Clause seven. It is all very standard.');
        if (Gm.monoCount()) await say('sterling', 'You already know our products work. You are running them.');
        S.flags.metSterling2 = true;
      } },
      { who: 'hanneke', pos: P_HAN, need: true, label: 'Give the council your answer', fn: async () => {
        if (!S.flags.metInes || !S.flags.metSterling2) { await say('hanneke', 'The council wants an answer tonight. Hear them both out first: the mayor of Dijkveen and Mr Sterling are on the square.'); return false; }
        const c = await choose('hanneke', 'Well, Mayor? Dijkveen\'s Commons, Monolith\'s contract, or neither?', [{ t: 'Join the Commons', note: 'open builds −25% · help at night' }, { t: 'Sign with Monolith', note: '+€80k tonight · open builds locked' }, { t: 'Stay unaligned', note: 'no strings' }]);
        if (c === 0) { S.flags.commons = true; await say('hanneke', 'I will tell Dijkveen. They are sending a flag, apparently.'); UI.toast('Voxelstad joined the Commons. Open builds now cost 25% less.', 'good'); }
        else if (c === 1) { S.flags.exclusive = true; S.budget += 80; await say('hanneke', 'Signed. Mr Sterling\'s pen cost more than my bicycle.'); UI.toast('€80k signing bonus received. Open builds are locked by contract.', 'note'); }
        else await say('hanneke', 'Neither. The council will call that prudent or cowardly, depending on the week.');
        Gm.applyWorld();
      } },
    ]),
    4: () => evening([
      { who: 'joris', pos: P_JORIS, need: true, fn: async () => {
        await say('joris', 'Mayor. Got a minute? Someone has been trying passwords on the old remote login all afternoon. Thousands of them.');
        await say('joris', S.own.nis2 ? 'The baseline is holding. Multi-factor stops them at the door. But they are patient.' : 'We never fixed the basics. If you have the budget left, tonight is a very good night to fund the security baseline.');
        await say('joris', 'Either way: sleep with your phone on.');
      } },
      { who: 'hanneke', pos: P_HAN, fn: async () => {
        await say('hanneke', 'One more day, then the vote. For what it is worth: the town is talking about you. Mostly in complete sentences.');
      } },
    ]),
  };

  /* ---------- the night ---------- */
  async function night() {
    await UI.card('Night 4 · 02:14', 'The night of the ransom', 'Your phone lights up. It is Joris. He is not whispering.', 'Pick up');
    Gm.startNight();
    await say('joris', 'Mayor. They are in. Same crew. It is hopping from building to building over the old network.');
    await say('joris', 'I cannot cut the old links from here. Someone has to pull the uplink in each building before it encrypts. That is you. Run. Take the truck if you have to.');
    if (S.own.workplace === 'open') await say('joris', 'The new cloud is ours, so I can cut one building at a time from here. I will take whichever is closest to gone.');
    else if (S.flags.commons) await say('joris', 'Dijkveen\'s night team is on the line. They will cut what they can reach.');
    await G.until(() => {
      const inf = Object.keys(S.night.nodes).filter((k) => S.night.nodes[k].state === 'infected').sort((a, b) => S.night.nodes[a].t - S.night.nodes[b].t)[0];
      UI.setObjective(inf ? `Pull the uplink at the ${LOC.nodes[inf].name}` : 'Isolate buildings before the next wave hits', inf ? LOC[LOC.nodes[inf].at] : null);
      return S.night.done;
    });
    UI.setObjective(null);
    const lost = S.night.lost, names = lost.map((id) => LOC.nodes[id].name).join(', ');
    if (!lost.length) { await say('joris', 'Contained. All of it. Nothing encrypted. Mayor, I could kiss you. I will not.'); Gm.afterNight(false); }
    else if (S.own.nis2 || S.own.workplace === 'open') { await say('joris', `They got ${names}. But the offline backups are clean. I will have everything restored before the counter opens.`); Gm.afterNight(false); }
    else {
      await say('joris', `They got ${names}. And we have no tested backups. The note on the screen wants a hundred and twenty thousand.`);
      const c = await choose('hanneke', 'It is your call, Mayor. I will not pretend either answer is good.', [{ t: 'Pay the ransom', note: '−€120k · −8 trust · systems restored' }, { t: 'Refuse. Rebuild by hand.', note: 'those desks are back on paper tomorrow' }]);
      if (c === 0) { S.budget -= 120; Gm.trust(-8); S.flags.paid = true; Gm.afterNight(false); await say('hanneke', 'It is done. We will be on their list forever now.'); }
      else { Gm.trust(-2 * lost.length); Gm.afterNight(true); await say('hanneke', 'Then those desks are back on paper tomorrow. So be it. We know how.'); }
    }
    if (Gm.monoCount()) await say('sterling', 'Out of an abundance of caution, Monolith has suspended all Voxelstad tenant services pending a security review. Ticket 48213. Expected resolution: midday.');
    if (S.flags.exclusive) { S.flags.exclusive = false; S.flags.wasExclusive = true; await say('hanneke', 'One good thing. A suspension on their side voids clause seven. We are free to buy open again.'); }
    S.score += S.night.saved * 60; Gm.applyWorld();
  }

  /* ---------- ending ---------- */
  function ending() {
    const sov = Gm.sovereignty(), mono = Gm.monoCount(), systems = Gm.ownedCount(), t = S.trust, lost = S.night ? S.night.lost.length : 0;
    const score = Math.round(S.score + t * 20 + sov * 10 + Math.max(0, S.budget) * 2), grade = score >= 9500 ? 'A+' : score >= 8000 ? 'A' : score >= 6500 ? 'B' : score >= 5000 ? 'C' : 'D';
    let title, kicker, paras = [];
    if (t < 40) { kicker = 'Vote of no confidence'; title = 'The council thanks you for your service'; paras.push('The vote is 19 to 12 against. Nobody is unkind about it. The queue was simply longer than the town\'s patience.'); }
    else if (sov >= 60 && t >= 68) { kicker = 'Confirmed, 27 to 4'; title = 'The Commons town'; paras.push('Voxelstad runs on systems it owns, built with its neighbours, and the visitors on Open Town Day went home with a copy of the code. Three more towns have asked to join.'); }
    else if (mono >= 3 && t >= 55) { kicker = 'Confirmed, 18 to 13'; title = 'Efficient, on someone else\'s terms'; paras.push('The town works. The counter is quiet, the bins are empty. And every morning an invoice arrives from Monolith, a little higher than the one before. The council confirms you, and asks what leaving would cost.'); }
    else if (systems <= 3) { kicker = 'Confirmed, 16 to 15'; title = 'The paper mayor'; paras.push('You carried the town on your own two feet, and it noticed. But your feet are one pair, and the queue is forty-eight thousand long. The council confirms you by a single vote and a great deal of sympathy.'); }
    else { kicker = 'Confirmed, 22 to 9'; title = 'A steady hand'; paras.push('Not everything got built, and not everything that got built is yours. But the town runs better than the week you found it, and people say so at the market.'); }
    if (S.flags.metDeWit) paras.push(S.flags.counter ? 'Mevrouw De Wit renewed her card at the counter in the spring. Fatima set up the wallet on her new phone. She mostly uses it to check which bin goes out.' : 'Mevrouw De Wit\'s card expired in the spring. The kiosk has a help button. Nobody saw her press it.');
    if (S.night) paras.push(lost === 0 ? 'They still tell the story of the night the mayor ran from building to building pulling cables, and nothing was lost.' : S.flags.paid ? 'The ransom was paid quietly. The same crew hit Dijkveen\'s neighbour two months later. They mentioned Voxelstad as a reference.' : lost >= 3 ? 'The night of the ransom took weeks to recover from. The backups are tested every Friday now.' : 'The night of the ransom cost the town some sleep and a few desks. It could have been all of them.');
    if (S.flags.commons) paras.push('The Commons flag still hangs beside the town\'s own. Joris has two colleagues now. One of them is in Dijkveen.');
    else if (S.flags.wasExclusive) paras.push('Victor Sterling sent a fruit basket and a renewal offer. Hanneke returned the basket.');
    Gm.clearSave(); Gm.finish(); UI.setObjective(null); G.Audio.music('title');
    UI.ending({ grade, title, kicker, paras, trust: t, sov, systems, mono, manual: S.stats.manual, auto: S.stats.auto, missed: S.stats.missed, score: String(score).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') });
  }

  /* ---------- the run ---------- */
  St.run = async function (startDay) {
    S = G.S;
    if (startDay === 1) await intro();
    for (let day = startDay; day <= 5; day++) {
      S.day = day; Gm.save(); Gm.startDay(day);
      await UI.card(`Day ${day} of 5`, TITLES[day], BLURBS[day], 'Start the day');
      await morning[day]();
      Gm.openCounter(); UI.setObjective('Serve the town until the counter closes at 17:00');
      await G.until(() => S.dayDone);
      UI.setObjective(null); G.Audio.sfx('buy');
      await UI.summary(Gm.endOfDay());
      if (day < 5) await evenings[day]();
      if (day === 4) await night();
    }
    ending();
  };
})();

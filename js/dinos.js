/*
 * The dinosaur roster. `name` uses soft hyphens (\u00AD) so long names can
 * wrap neatly on small cards. Facts were checked against museum and news
 * sources and kept to claims that are well supported.
 */
(function () {
  'use strict';

  const A = window.DinoArt;
  const SH = '\u00AD';

  const DINOS = [
    {
      id: 'velociraptor',
      name: `Veloci${SH}raptor`,
      say: 'vuh-LOSS-ih-rap-tor',
      raptor: true,
      bg: '#fbefd3',
      fact: 'Velociraptor was only about the size of a turkey, way smaller than the raptors in the movies! Scientists found bumps on its arm bone where big feathers grew.',
      look: {
        colors: { body: '#d6a65a', belly: '#f6e4bd', dark: '#a87b3c', feather: '#93582c', pattern: '#82491f' },
        pattern: 'stripes', crest: 'tuft',
      },
    },
    {
      id: 'deinonychus',
      name: `Deino${SH}nychus`,
      say: 'dye-NON-ih-kus',
      raptor: true,
      bg: '#e2ecfa',
      fact: 'Deinonychus means "terrible claw." It had a big curved claw on each foot, and it held that claw up off the ground to keep it sharp.',
      look: {
        colors: { body: '#5f87c4', belly: '#d6e3f5', dark: '#3f5f94', feather: '#2c4877', crest: '#e2533c', pattern: '#2c4877' },
        pattern: 'bands', crest: 'plume',
      },
    },
    {
      id: 'utahraptor',
      name: `Utah${SH}raptor`,
      say: 'YOO-tah-rap-tor',
      raptor: true,
      bg: '#e4f2d9',
      fact: 'Utahraptor is the biggest raptor ever found. It was longer than a car!',
      look: {
        colors: { body: '#5c9b48', belly: '#e5f0c7', dark: '#3e7533', feather: '#2f5d29', crest: '#f2c94c', pattern: '#2f5d29' },
        pattern: 'chevrons', crest: 'mohawk', bulk: 1.3, headSize: 1.15, neckW: 1.15,
      },
    },
    {
      id: 'dakotaraptor',
      name: `Dakota${SH}raptor`,
      say: 'duh-KOH-tuh-rap-tor',
      raptor: true,
      bg: '#ebe9e6',
      fact: 'Dakotaraptor lived at the same time and place as T. rex and Triceratops. It had big wing feathers, but it was much too heavy to fly.',
      look: {
        colors: { body: '#5e5651', belly: '#dccdb9', dark: '#3e3834', feather: '#2c2825', crest: '#e14e39', pattern: '#f6f1e8' },
        pattern: 'speckles', crest: 'tuft', bulk: 1.1, armFeathers: 1.45,
      },
    },
    {
      id: 'microraptor',
      name: `Micro${SH}raptor`,
      say: 'MY-kroh-rap-tor',
      raptor: true,
      bg: '#dfe9f7',
      fact: 'Microraptor had four wings, with long feathers on its arms and its legs! Scientists think its feathers were shiny black, like a crow\'s.',
    },
    {
      id: 'austroraptor',
      name: `Austro${SH}raptor`,
      say: 'AW-stroh-rap-tor',
      raptor: true,
      bg: '#dbf3ee',
      fact: 'Austroraptor had super short arms for a raptor, plus little cone-shaped teeth. Some scientists think it liked to eat fish!',
      look: {
        colors: { body: '#3aa596', belly: '#d3f0e9', dark: '#277a6f', feather: '#1f6158', pattern: '#1f6b62' },
        pattern: 'spots', crest: 'fluff', snout: 1.45, snoutDepth: 0.8, armFeathers: 0.5, armLen: 0.6, teeth: 6,
      },
    },
    {
      id: 'buitreraptor',
      name: `Buitre${SH}raptor`,
      say: 'BWEE-treh-rap-tor',
      raptor: true,
      bg: '#e9e4f4',
      fact: 'Buitreraptor was named after La Buitrera, a place in Argentina where vultures nest. It had a long, skinny snout full of tiny teeth.',
      look: {
        colors: { body: '#ece6d9', belly: '#fffaf0', dark: '#bdb5a5', feather: '#33302d', crest: '#33302d', pattern: '#33302d' },
        pattern: 'bands', mask: true, crest: 'plume', snout: 1.5, snoutDepth: 0.72, bulk: 0.86, teeth: 6,
      },
    },
    {
      id: 'pyroraptor',
      name: `Pyro${SH}raptor`,
      say: 'PIE-roh-rap-tor',
      raptor: true,
      bg: '#ffe4d9',
      fact: 'Pyroraptor means "fire thief." Its bones were found in France after a big forest fire in 1992.',
      look: {
        colors: { body: '#e14a30', belly: '#ffd9a0', dark: '#a8321f', feather: '#f39c1f', crest: '#ffcf3f', pattern: '#ffb52b' },
        pattern: 'flames', crest: 'mohawk',
      },
    },
    {
      id: 'achillobator',
      name: `Achillo${SH}bator`,
      say: 'uh-KIL-oh-bah-tor',
      raptor: true,
      bg: '#ede5fa',
      fact: 'Achillobator was a big raptor from Mongolia. Its name mixes the Achilles tendon (the strong cord at the back of your ankle) with "baatar," a Mongolian word for hero!',
      look: {
        colors: { body: '#7e63b9', belly: '#e7ddf6', dark: '#5a458d', feather: '#4a3777', crest: '#f4a9d2', pattern: '#4a3777' },
        pattern: 'zigzag', crest: 'tuft', bulk: 1.15,
      },
    },
    {
      id: 'dromaeosaurus',
      name: `Dromaeo${SH}saurus`,
      say: 'DROH-mee-oh-SOR-us',
      raptor: true,
      bg: '#fcf4d2',
      fact: 'The whole raptor family, called dromaeosaurs, is named after Dromaeosaurus! Its name means "running lizard."',
      look: {
        colors: { body: '#e5c23f', belly: '#fbf1c6', dark: '#b6932a', feather: '#865719', pattern: '#6b4518', patternFill: '#c9992c' },
        pattern: 'rosettes', crest: 'fluff', snout: 0.85, snoutDepth: 1.3,
      },
    },
    {
      id: 'bambiraptor',
      name: `Bambi${SH}raptor`,
      say: 'BAM-bee-rap-tor',
      raptor: true,
      bg: '#f6e3d3',
      fact: 'Bambiraptor was discovered by a 14-year-old boy named Wes, who was hunting for fossils with his family in Montana!',
      look: {
        colors: { body: '#b26c3e', belly: '#f3dcc4', dark: '#844f2c', feather: '#7a4527', pattern: '#fff4e3' },
        pattern: 'dots', crest: 'fluff', headSize: 1.12, eyeSize: 1.25, snout: 0.8, bodyLen: 0.94, teeth: 3,
      },
    },
    {
      id: 'sinornithosaurus',
      name: `Sin${SH}ornitho${SH}saurus`,
      say: 'SYE-nor-NITH-oh-SOR-us',
      raptor: true,
      bg: '#feead6',
      fact: 'Sinornithosaurus means "Chinese bird lizard." Its fossils show it was covered in fluffy feathers.',
      look: {
        colors: { body: '#ef8a2c', belly: '#fde3c1', dark: '#b8631b', feather: '#3a2a1f', crest: '#3a2a1f', pattern: '#2e221b' },
        pattern: 'tiger', crest: 'fluff',
      },
    },
    {
      id: 'halszkaraptor',
      name: `Halszka${SH}raptor`,
      say: 'HAHLSH-kuh-rap-tor',
      raptor: true,
      bg: '#d6ecf7',
      fact: 'Halszkaraptor had a long neck like a swan and flipper-like arms. It may have swum and hunted fish like a duck!',
    },
    {
      id: 'atrociraptor',
      name: `Atroci${SH}raptor`,
      say: 'uh-TROSS-ih-rap-tor',
      raptor: true,
      bg: '#f8e0e4',
      fact: 'Atrociraptor means "savage robber." It had a short, deep snout, which may have given it an extra-strong bite.',
      look: {
        colors: { body: '#a63c50', belly: '#f3c9d0', dark: '#762637', feather: '#561a28', crest: '#f4b740', pattern: '#5a1a2a' },
        pattern: 'saddle', crest: 'mohawk', snout: 0.75, snoutDepth: 1.45, headSize: 1.08,
      },
    },

    /* ---- not raptors ---- */
    {
      id: 'therizinosaurus',
      name: `Therizino${SH}saurus`,
      say: 'THER-ih-ZEEN-oh-SOR-us',
      raptor: false,
      bg: '#e7f0d6',
      fact: 'Therizinosaurus had the longest claws of any known land animal, longer than your whole arm! But it was probably a plant-eater that used them to pull branches close.',
    },
    {
      id: 'pachycephalosaurus',
      name: `Pachy${SH}cephalo${SH}saurus`,
      say: 'PAK-ee-SEF-uh-loh-SOR-us',
      raptor: false,
      bg: '#f3e6f6',
      fact: 'Pachycephalosaurus means "thick-headed lizard." The bony dome on top of its head was up to 8 inches thick!',
    },
    {
      id: 'parasaurolophus',
      name: `Parasauro${SH}lophus`,
      say: 'PAIR-uh-sor-OL-uh-fus',
      raptor: false,
      bg: '#fdf0dc',
      fact: 'Parasaurolophus had a long, hollow crest on its head. Scientists think it blew air through the crest to make loud honking calls, like a trombone!',
    },
    {
      id: 'carnotaurus',
      name: `Carno${SH}taurus`,
      say: 'KAR-noh-TOR-us',
      raptor: false,
      bg: '#fde2dc',
      fact: 'Carnotaurus means "meat-eating bull," because of the two horns over its eyes. Its arms were super tiny, even shorter for its size than T. rex\'s!',
    },
    {
      id: 'amargasaurus',
      name: `Amarga${SH}saurus`,
      say: 'uh-MAR-guh-SOR-us',
      raptor: false,
      bg: '#e0eefb',
      fact: 'Amargasaurus was a long-necked plant-eater with two rows of tall spikes running down its neck and back. Nobody knows for sure what the spikes were for!',
    },
    {
      id: 'oviraptor',
      name: `Ovi${SH}raptor`,
      say: 'OH-vih-rap-tor',
      raptor: false,
      bg: '#fff3cf',
      fact: 'Oviraptor means "egg thief," because it was found near a nest of eggs. Later, scientists figured out the eggs were its own kind, so it was no thief after all!',
    },
  ];

  // Raptors with a `look` use the shared raptor drawing; the rest have custom art.
  for (const d of DINOS) {
    d.plainName = d.name.replace(/\u00AD/g, '');
    d.art = function () {
      return this.look ? A.raptor(Object.assign({ label: this.plainName }, this.look)) : A.custom[this.id](this);
    };
  }

  window.DINOS = DINOS;
})();

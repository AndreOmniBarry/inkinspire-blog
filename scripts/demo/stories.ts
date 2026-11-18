/**
 * Demo stories: original short pieces written for Inkinspire's demo content.
 * They exist to show the design and every literary element working. They are labelled as demo
 * content in the Studio and removed with one button (Studio › Settings) or `pnpm demo:remove`.
 * No existing copyrighted text is reproduced.
 */
export type DemoStory = {
  slug: string;
  title: string;
  subtitle?: string;
  excerpt: string;
  category: string; // category slug
  visibility: "free" | "premium";
  tags: string[];
  featured?: boolean;
  collection?: string;
  /** Days before seeding that the story was "published". Negative = scheduled in the future. */
  daysAgo: number;
  body: string;
};

export const demoStories: DemoStory[] = [
  {
    slug: "the-hour-before-the-generator",
    title: "The Hour Before the Generator",
    subtitle: "On the strange, shared silence of a Lagos street when the power goes",
    excerpt: "Every evening, between the light going and the generators starting, our street remembers it is a street.",
    category: "human-experiences",
    visibility: "free",
    tags: ["lagos", "community", "evenings"],
    featured: true,
    daysAgo: 2,
    body: `
epigraph: We were neighbours long before we were strangers. | Overheard on Adeniyi Street

^Every evening, between the light going and the generators starting, our street remembers it is a street. For a few minutes nobody is anywhere else. The televisions die mid-sentence, the fans sigh to a stop, and a hundred small private worlds are returned, rather rudely, to the commons.

You hear it first as a collective exhale. Then a child laughs, because children always find the dark funny before they find it frightening. Then Mama Nkechi, two balconies over, calls out to nobody in particular that *these people have done it again*, and the street answers her, because this is the one complaint we have all agreed to share.

I have lived in buildings where I knew no one's name. I have lived in cities where the power never failed and my neighbours were a rumour of footsteps. It took the dark to teach me that a street is not a row of houses. It is a conversation that only starts when the noise stops.

***

In that hour, people come out. Not far: to the balcony, the gate, the low wall by the gutter. Phones become torches. Someone's radio, the old kind with batteries, carries the evening news into the open air, and three men who have never spoken argue happily about a footballer none of them has met.

pull: It took the dark to teach me that a street is not a row of houses. It is a conversation that only starts when the noise stops.

The woman who sells suya at the junction does her best business then. Her coals are the brightest thing for half a mile, and we drift towards them the way people have always drifted towards fire, with our hands in our pockets and our guards a little lower than usual.

I learned the name of the boy upstairs that way. Tunde. He is eleven, he wants to be an engineer, and he has a theory, delivered with great seriousness in the glow of a phone screen, about why the transformer always fails on Thursdays. I don't know if he is right. I know I would never have heard it with the lights on.

## The generators

Then, one by one, the generators begin. First the big one at the hotel, a deep cough that rattles the windows. Then the smaller ones, each with its own voice: the stuttering one, the whining one, the one that sounds like a motorbike that has given up on life. The street fills with noise and fumes and light, and we go back inside, back to our separate screens, as if nothing has happened.

But something has. Every night, for an hour, we are given back to each other. I have started to look forward to it, which feels like a betrayal of every complaint I have ever made about the power supply. I complain anyway. It is part of the ritual. Then I go out to the gate and wait to see who else is there.
`,
  },
  {
    slug: "what-my-grandmother-knew-about-salt",
    title: "What My Grandmother Knew About Salt",
    subtitle: "A lesson in measure, given without a single measurement",
    excerpt: "She never measured anything. When I asked how much salt, she said: until it tastes like you mean it.",
    category: "life-and-lessons",
    visibility: "free",
    tags: ["family", "food", "grandmothers"],
    featured: true,
    daysAgo: 6,
    body: `
^My grandmother never measured anything. When I was nine and determined to learn her pepper soup, I followed her around the kitchen with an exercise book, asking how much of this, how long for that. She looked at me the way you look at someone who has asked how much love to put in a letter.

"Salt," I said, pencil ready. "How much?"

"Until it tastes like you mean it."

I wrote that down. I still have the book. It is full of answers like that, and for years I thought she was being difficult. I was an anxious child; I wanted rules. I wanted the world to come with quantities.

***

It took me a long time, and several failed soups, to understand that she was giving me the only true instruction. Recipes are written for an average kitchen, an average pot, average tomatoes picked on an average day. My grandmother cooked for the kitchen in front of her. She tasted. She adjusted. She paid attention.

pull: Recipes are written for an average kitchen. My grandmother cooked for the kitchen in front of her.

Salt is the clearest example. Too little and the food is polite, forgettable, a guest who never says what they think. Too much and it shouts over everything else. The right amount is not a number. It is the point at which the food becomes most fully itself.

I think about this more than I think about soup. About how much of myself to put into a conversation, a job, a friendship. About the difference between being honest and being harsh, between being kind and being bland. There is no rule for it. There is only tasting, and adjusting, and paying attention to the person in front of you.

## The last lesson

The last time I cooked with her, her hands shook too much to hold the spoon, so she sat on a stool and supervised. I made the soup. I salted it. I held the spoon out to her and she tasted, closed her eyes, and was quiet for long enough that I began to worry.

"Now," she said finally, "you mean it."

I have not been given a better compliment since.
`,
  },
  {
    slug: "harmattan-letter",
    title: "Harmattan Letter",
    subtitle: "A poem",
    excerpt: "The dust arrives the way news does, from far away and all at once.",
    category: "poetry-and-creative-writing",
    visibility: "free",
    tags: ["poetry", "harmattan", "distance"],
    featured: true,
    daysAgo: 9,
    body: `
epigraph: Every season has its letter. This one comes in dust. | Xenia

verse
    The dust arrives the way news does,
    from far away and all at once,
    settling on the windowsill
    before we've thought to close the house.

    My mother wipes the table twice,
    then gives up, lets the morning stand
    in its fine red coat. *It is the season,*
    she says, as if the season were a hand

        that knows exactly where it's going,
        that has been here before, and will
        again. I write to you through all of it:
        the cracked lip, the cold, the sudden chill

    at six o'clock when the sun goes small
    and orange as a coin behind the haze.
    You are four countries and a sea away.
    I count the distance in these hazy days.

    I want to tell you that the mango trees
    are holding on. That someone sweeps
    the compound every dawn, and every dawn
    the wind returns the dust it keeps.

    I want to tell you that I'm fine,
    and mean it. Some days I nearly do.
    The harmattan will pass, my mother says.
    It always does. I'm writing anyway, to you.
:end

***

*This poem is part of Inkinspire's demo content, written to show how verse is typeset: stanza breaks, indented lines, and long lines that wrap with a hanging indent instead of collapsing on a small screen.*
`,
  },
  {
    slug: "on-not-being-asked",
    title: "On Not Being Asked",
    subtitle: "The quiet violence of decisions made about us, without us",
    excerpt: "Nobody shouted. Nobody was cruel. They simply decided, in a room I was not in, what would happen to my life.",
    category: "uncomfortable-truths",
    visibility: "premium",
    tags: ["family", "power", "voice"],
    daysAgo: 12,
    body: `
^Nobody shouted. That is the first thing I want you to understand. Nobody was cruel, nobody slammed a door. They simply decided, in a room I was not in, what would happen to my life, and then they told me over dinner as if they were passing the stew.

I was nineteen. The decision was about which course I would study, which city I would live in, and, though nobody said so, which kind of person I would be allowed to become. It was made with love. I have never doubted that. It was also made entirely without me.

pull: It was made with love. I have never doubted that. It was also made entirely without me.

We talk a great deal about the obvious harms: the raised hand, the cruel word. We have fewer words for this one, the decision taken on your behalf by people who are sure they know better, and who may even be right. It leaves no mark. It is very hard to explain to anyone who has not felt it why it hurts.

---paywall---

## What it costs

Here is what it cost me. Not the course; I came to like the course. Not the city; cities are cities. It cost me the habit of believing my own preferences were worth stating. For years afterwards, when someone asked what I wanted, I would feel a small blankness, a pause in which I tried to work out what the right answer was, the one that would be approved in the room I was not in.

I have watched the same thing happen to friends. To the colleague who was moved to a new team "for her own development" and never asked if she wanted to develop in that direction. To the cousin whose wedding was planned so thoroughly by others that she described it, afterwards, as a lovely party she had attended.

***

## The question

I am not arguing that elders should never decide, or that young people always know best. I am arguing for something smaller and harder: the question. *What do you think?* Asked before, not after. Asked when the answer can still change something.

It costs very little to ask. It costs a great deal not to. I know, because I am still learning, slowly and in my thirties, how to answer.
`,
  },
  {
    slug: "the-second-draft-of-me",
    title: "The Second Draft of Me",
    subtitle: "Why nobody gets it right the first time, and why that is the point",
    excerpt: "Every writer knows the first draft is only there to show you what you were trying to say. I am beginning to think people work the same way.",
    category: "personal-growth",
    visibility: "free",
    tags: ["writing", "change", "self"],
    daysAgo: 15,
    body: `
epigraph: The first draft is just you telling yourself the story. | A teacher's note in the margin

^Every writer knows the first draft is not the story. It is the scaffolding you put up so you can see where the story might stand. It is clumsy, repetitive, sometimes embarrassing. It is also necessary. Nobody gets to the second draft without writing the first.

I have begun to think people work the same way.

The person I was at twenty-two was a first draft. Earnest, overwritten, full of grand statements I could not yet support. I said *always* and *never* a great deal. I mistook loudness for conviction and agreement for friendship. I would not want to be her again, but I am grateful to her. She wrote down everything I needed to cross out.

***

## Revision is not rejection

The mistake I made for years was thinking that changing meant admitting I had been wrong, and that being wrong meant being worthless. But that is not how revision works. When I cut a paragraph, I am not saying it should never have existed. I am saying it has done its work. It showed me what the next version needed.

pull: When I cut a paragraph, I am not saying it should never have existed. I am saying it has done its work.

So I am trying to read my old self the way I read an old draft: with interest, without contempt. *Ah, here is where she was afraid. Here is where she was trying too hard. Here is the sentence that is actually true, buried in the middle of all that noise.*

That last part matters most. Every bad draft has one true sentence in it. The work of a life, as far as I can tell, is finding those sentences and building the next version around them.

I am on my second draft now. Possibly my third. I expect there will be more.
`,
  },
  {
    slug: "ledger",
    title: "Ledger",
    subtitle: "A poem in accounts",
    excerpt: "What I owe, what I'm owed, and the column I keep leaving blank.",
    category: "poetry-and-creative-writing",
    visibility: "free",
    tags: ["poetry", "gratitude", "debt"],
    daysAgo: 19,
    body: `
verse:numbered
    I owe the woman at the bus stop
    who told me, once, my shoe was untied.
    I owe the rain for leaving early.
    I owe my brother for the time he lied

    to keep me out of trouble, badly,
    and took the trouble on himself.
    I owe a library card, a teacher,
    a dog-eared book on a dusty shelf.

    I'm owed an apology. Two, perhaps.
    I'm owed a letter, years ago, that never came.
    I'm owed the evening someone promised
    and spent elsewhere, without a name

    for what they'd done. I keep the columns
    the way my father kept the shop's:
    neatly, in pencil, so the numbers
    can be corrected when the price drops.

    And there's a third column, unheaded,
    where I mean to write what's simply given:
    the stranger's kindness, morning light,
    a debt that is not owed, but forgiven.

    I leave it blank. I don't know how
    to total what was never lent.
    I only know the sum is larger
    than anything I've ever spent.
:end
`,
  },
  {
    slug: "two-plates",
    title: "Two Plates",
    subtitle: "On the small, ordinary arithmetic of love",
    excerpt: "My father set out two plates every evening for forty years. After my mother died, he kept doing it for a month.",
    category: "relationships-and-emotions",
    visibility: "free",
    tags: ["love", "grief", "marriage"],
    daysAgo: 23,
    body: `
^My father set out two plates every evening for forty years. It was his job; my mother cooked, he laid the table, and neither of them would have dreamed of swapping. After she died, he kept setting out two plates for almost a month.

None of us said anything. We were afraid that if we mentioned it, he would stop, and that stopping would be worse.

***

I used to think love was something large: the grand declaration, the airport run, the song on the radio. My parents never did any of that. They were not demonstrative people. I don't think I ever saw them kiss. But I saw two plates, every evening, laid out with a fork on the left and a spoon on the right, a glass of water beside each.

pull: I don't think I ever saw them kiss. But I saw two plates, every evening, laid out with a fork on the left and a spoon on the right.

Love, it turns out, is mostly arithmetic. It is the sum of small, repeated acts that nobody notices until they stop. It is knowing how someone takes their tea. It is the extra blanket put out in harmattan. It is two plates.

One evening, about a month after the funeral, I came into the dining room and found one plate on the table. My father was sitting in front of it, very still. I sat down opposite him. After a while he got up, went to the kitchen, and came back with a second plate, which he put down in front of me.

We ate together. We have eaten together most evenings since. He still lays the table. It is still his job.
`,
  },
  {
    slug: "the-woman-who-sold-oranges-at-ojota",
    title: "The Woman Who Sold Oranges at Ojota",
    subtitle: "She asked me one question, and it changed the direction of my year",
    excerpt: "She peeled my orange in one long spiral, handed it to me, and asked what I was running from.",
    category: "inspirational-stories",
    visibility: "free",
    tags: ["lagos", "strangers", "courage"],
    featured: true,
    daysAgo: 28,
    body: `
^She peeled my orange in one long, unbroken spiral, the way they do, with a small knife and a thumb that has done this ten thousand times. Then she handed it to me and asked, without looking up, what I was running from.

I was at Ojota bus park at six in the morning with a bag packed for a job interview in a city I did not want to live in, for a job I did not want to do. I had not told anyone this. I had not entirely told myself. And here was a stranger, halfway through her own long day, asking the only question that mattered.

"Nothing," I said.

She laughed. It was not an unkind laugh. "Everybody running from something," she said. "The question is if you're running towards something too."

***

## Towards

I got on the bus. I want to be honest about that; this is not a story where a wise stranger speaks and the hero turns around. I went to the interview. I did badly, perhaps on purpose. And on the long ride home I peeled another orange, clumsily, in about forty pieces, and thought about the difference between leaving and arriving.

pull: Everybody running from something. The question is if you're running towards something too.

I had spent two years making decisions entirely by subtraction. Not this job, not this city, not this relationship. I had become very good at knowing what I didn't want. I had never once asked myself what I did.

It took most of that year to find an answer. It was smaller than I expected, and closer. But I would not have looked for it at all without a woman at Ojota who peeled oranges in a single spiral and asked strangers the right question.

I went back, months later, to thank her. Her stall was gone; someone else sold groundnuts in that spot. I bought some anyway. I like to think she is still out there somewhere, asking.
`,
  },
  {
    slug: "letters-to-my-younger-self-on-rooms",
    title: "Letters to My Younger Self: On Rooms",
    subtitle: "The first letter: about the rooms you'll be afraid to walk into",
    excerpt: "You will spend years standing at the doors of rooms you were invited into, wondering if the invitation was a mistake.",
    category: "thought-provoking-reflections",
    visibility: "premium",
    tags: ["letters", "confidence", "belonging"],
    collection: "letters-to-my-younger-self",
    featured: true,
    daysAgo: 33,
    body: `
epigraph: Dear you, | The first letter

^You will spend years standing at the doors of rooms you were invited into, wondering if the invitation was a mistake. Meetings. Dinners. Classrooms. Once, memorably, a wedding where you knew only the bride and spent the reception admiring the flowers so you would not have to speak to anyone.

I want to tell you something about those rooms, because nobody told me and I had to learn it slowly.

---paywall---

Most of the people in them feel exactly as you do.

I know you will not believe this. You will look around and see confidence everywhere: the man laughing too loudly by the window, the woman who always asks the first question, the ones who seem to know where to stand and what to do with their hands. You will assume they belong in a way you never will.

pull: You will look around and see confidence everywhere. You will assume they belong in a way you never will.

Some of them do. Most of them are performing, the way you are trying to perform, only with more practice. The man by the window is laughing because silence frightens him. The woman with the first question rehearsed it in the car. They are standing at their own doors, too. They have just learned to stand there more convincingly.

***

## What to do instead

So here is my advice, for what it's worth from someone who is still learning it. When you walk into a room, look for the other person standing at the door. There is always one. Go and stand with them. Ask them something real.

You will find, nearly every time, that a room becomes a room you belong in the moment you make someone else feel they belong in it too.

You will forget this. You will have to remember it again, many times. That's all right. I'm writing it down so that one of us has it in writing.

With love, and more patience than you would believe,

Me
`,
  },
  {
    slug: "the-quiet-arithmetic-of-leaving",
    title: "The Quiet Arithmetic of Leaving",
    subtitle: "On friendships that end without an ending",
    excerpt: "Some friendships end with a fight. Most simply grow quiet, one unanswered message at a time.",
    category: "relationships-and-emotions",
    visibility: "free",
    tags: ["friendship", "loss", "change"],
    daysAgo: 38,
    body: `
^Some friendships end with a fight. You can point to the day, the words, the door. Those are painful, but at least they are stories; they have a shape you can tell.

Most friendships do not end like that. They simply grow quiet. A message answered a day late, then a week late, then not at all. A birthday remembered with a short note instead of a call. Plans made in the vague future tense, *we must, we should, soon*, that both of you know will never arrive.

***

I have been thinking about a friend I will call T. We were inseparable at university. We shared a room, a wardrobe, and most of our secrets. I was the first person she called when her father was ill; she was the first person I told about the man I would later marry.

pull: Nobody did anything wrong. That is what makes it so hard to grieve.

We have not spoken properly in four years. Nobody did anything wrong. That is what makes it so hard to grieve. There is no villain, no betrayal, nothing to forgive. Our lives simply moved in different directions, at different speeds, and the distance grew one unremarkable day at a time.

## Permission

I used to feel guilty about this, as if a friendship that ended had been a failure. I am trying, now, to see it differently. Some people walk beside us for a season. They are not less important for having left. The years with T made me who I am, and those years are not undone because the present is quiet.

Last month I sent her a message. Not *we must catch up*. Just: *I was thinking of you today, and of that terrible orange wardrobe. I hope you're well.* She replied within the hour, with a photograph of the same wardrobe, still in her mother's house.

We may not speak again for a long time. That's all right. Some quiet is not an ending. It is just a pause.
`,
  },
  {
    slug: "what-we-inherit-and-do-not-name",
    title: "What We Inherit and Do Not Name",
    subtitle: "The things passed down without being handed over",
    excerpt: "My family gave me land, a surname and a recipe for jollof. It also gave me a silence, and I have only just learned its shape.",
    category: "uncomfortable-truths",
    visibility: "premium",
    tags: ["family", "silence", "inheritance"],
    daysAgo: 44,
    body: `
^My family gave me a small piece of land in the village, a surname that people in a certain town still recognise, and a recipe for jollof that I am not allowed to share. It also gave me a silence. I have only recently begun to learn its shape.

The silence was about my grandfather's first wife. Nobody spoke of her. There was no photograph, no grave I was taken to, no story at Christmas. I knew of her only because, when I was twelve, an aunt said her name by mistake and the whole room went still, the way a room does when someone drops a glass.

pull: The whole room went still, the way a room does when someone drops a glass.

---paywall---

## The shape of a silence

A silence is not empty. That is what I did not understand as a child. It has edges. It has weight. It changes the way everyone in a family moves, the way furniture changes how you walk through a room even in the dark. We had all learned to walk around her without ever being told she was there.

When I finally asked, as an adult, my mother told me what she knew. It was not much, and it was not mine to tell here. But I will say this: it was not a scandal. It was a sorrow. A young woman, a difficult time, a decision made by others. The silence had not been protecting the family from shame. It had been protecting people from grief they did not know how to carry.

***

## What I will pass on

I have children now. I am trying to decide what to give them. The land, yes. The surname, certainly. The jollof, eventually, when they are old enough to keep a secret.

But not the silence. Or rather, not the silence unexplained. I want to tell them her name, and the little I know, and that it is all right to ask. That grief carried together is lighter than grief hidden in the walls.

Some inheritances should be refused. Others should simply be opened, aired out, and handed over properly at last.
`,
  },
  {
    slug: "letters-to-my-younger-self-on-patience",
    title: "Letters to My Younger Self: On Patience",
    subtitle: "The second letter: about the slow things that matter most",
    excerpt: "You want everything now. I understand. I want to tell you about the things that only grow slowly.",
    category: "personal-growth",
    visibility: "free",
    tags: ["letters", "patience", "growth"],
    collection: "letters-to-my-younger-self",
    daysAgo: -3,
    body: `
epigraph: Dear you, again, | The second letter

^You want everything now. I understand; I remember. The career, the certainty, the version of yourself you can see so clearly that it seems absurd you are not already her. You treat every delay as a verdict.

I want to tell you about the things that only grow slowly.

***

Friendship, for one. The real kind, the kind that survives distance and silence and your worst year, does not happen in a semester. It is built over a thousand ordinary evenings, most of which you will not remember.

Skill, for another. You will write a great many bad sentences before you write a good one, and then a great many more before you can write a good one on purpose. Nobody can rush this for you. Not even you.

pull: You will write a great many bad sentences before you write a good one, and then a great many more before you can write a good one on purpose.

And yourself. That is the slowest of all. You will not arrive at a finished version and stop. You will keep becoming, quietly, for the rest of your life, and most of the change will happen in the years when you think nothing is happening at all.

So be patient. Not passive; patient. Keep planting things. Water them even when nothing shows above the soil. One day, years from now, you will look up and find yourself standing in a garden you do not remember growing.

With love, from a little further down the road,

Me
`,
  },
];

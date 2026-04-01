import type { Section, Question, Responses } from '../types'

// ── Pronoun helpers ───────────────────────────────────────────────────────────

interface PronounSet {
  subj: string  // they/he/she
  poss: string  // their/his/her
  obj: string   // them/him/her
}

function parsePronoun(pronouns: string | undefined): PronounSet {
  const p = (pronouns ?? '').toLowerCase().trim()
  if (p.startsWith('she')) return { subj: 'she', poss: 'her', obj: 'her' }
  if (p.startsWith('he')) return { subj: 'he', poss: 'his', obj: 'him' }
  return { subj: 'they', poss: 'their', obj: 'them' }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Naming context ────────────────────────────────────────────────────────────
// Counter cycles: 0 → name, 1 → pronoun, 2 → pronoun, 3 → name, ...
// In impersonal voice the counter is ignored and the name is always used.

interface NamingCtx {
  name: string
  pronouns: PronounSet
  voice: 'direct' | 'impersonal'
  counter: number
}

function getSubject(ctx: NamingCtx): string {
  if (ctx.voice === 'impersonal' || ctx.counter % 3 === 0) return ctx.name
  return cap(ctx.pronouns.subj)
}

function advanceCtx(ctx: NamingCtx): NamingCtx {
  return { ...ctx, counter: ctx.counter + 1 }
}

// Replaces {N} (subject), {poss} (possessive adjective), {obj} (object pronoun)
// Note: {N}'s in template strings becomes "name's" in impersonal or when counter is on name;
// use {poss} in templates for mid-sentence possessives.
function applyCtx(template: string, ctx: NamingCtx): [string, NamingCtx] {
  const subject = getSubject(ctx)
  const result = template
    .replace(/\{N\}/g, subject)
    .replace(/\{poss\}/g, ctx.pronouns.poss)
    .replace(/\{obj\}/g, ctx.pronouns.obj)
  return [result, advanceCtx(ctx)]
}

// ── Condition matching ────────────────────────────────────────────────────────

function conditionMatches(
  condition: string | string[],
  response: string | string[] | boolean
): boolean {
  const resp = Array.isArray(response) ? response : [String(response)]
  const conds = Array.isArray(condition) ? condition : [condition]
  return conds.some(c => resp.includes(c))
}

// ── Sentence bank ─────────────────────────────────────────────────────────────
// d = direct voice (16+): {N} cycles name/pronoun
// i = impersonal voice (under-16): {N} is always the child's name
// In impersonal templates, {N}'s = "name's" (literal apostrophe-s after {N} placeholder)

type RuleVariants = { d: string[]; i: string[] }

const BANK: Record<string, Record<string, RuleVariants>> = {

  // ── 2.1 Speech, Language and Communication ──────────────────────────────────

  '2.1.1': {
    yes: {
      d: [
        '{N} reported concerns about {poss} speech and language development during the early years.',
        '{N} described having experienced difficulties with speech and language in early childhood.',
        '{N} indicated that there had been concerns about {poss} speech and language development.',
        '{N} noted that speech and language difficulties were evident during {poss} early years.',
        '{N} recalled concerns regarding {poss} speech and language development in early childhood.',
      ],
      i: [
        'Concerns were noted regarding {N}\'s speech and language development in the early years.',
        'It was reported that {N} had experienced difficulties with speech and language during early childhood.',
        '{N}\'s parent/carer indicated that there had been concerns about {N}\'s speech and language development.',
        'According to parental report, {N}\'s speech and language development had given rise to concerns.',
        'It was noted that {N}\'s speech and language development had been a cause for concern in the early years.',
      ],
    },
  },

  '2.1.1b': {
    yes: {
      d: [
        '{N} reported having received speech and language therapy.',
        '{N} described receiving speech and language therapy or support.',
        '{N} indicated that {poss} speech and language difficulties had been supported through therapy.',
        '{N} noted having had speech and language therapy as a child.',
        '{N} mentioned receiving speech and language support.',
      ],
      i: [
        'It was reported that {N} had received speech and language therapy.',
        '{N}\'s parent/carer noted that {N} had received speech and language therapy or support.',
        'Speech and language therapy had been provided for {N}, according to parental report.',
        'It was indicated that {N} had received speech and language therapy or support.',
        'Parental report confirmed that {N} had received speech and language therapy.',
      ],
    },
  },

  '2.1.2': {
    yes: {
      d: [
        '{N} reported current concerns about {poss} speech, language, or communication.',
        '{N} described having ongoing difficulties with speech, language, or communication.',
        '{N} indicated current concerns relating to {poss} speech or language.',
        '{N} noted difficulties with speech, language, or communication at the time of assessment.',
        '{N} mentioned having ongoing concerns about {poss} speech or communication.',
      ],
      i: [
        'Ongoing concerns were noted regarding {N}\'s speech, language, or communication.',
        'It was reported that {N} continued to experience difficulties with speech, language, or communication.',
        '{N}\'s parent/carer indicated current concerns about {N}\'s speech or language.',
        'Concerns regarding {N}\'s speech, language, or communication were reported as ongoing.',
        'It was noted that concerns about {N}\'s speech and language remained at the time of assessment.',
      ],
    },
  },

  '2.1.3': {
    yes: {
      d: [
        '{N} reported concerns about {poss} social interaction or communication with others.',
        '{N} described difficulties with social communication or interaction.',
        '{N} indicated that there had been concerns about {poss} social interaction.',
        '{N} noted difficulties in the area of social communication.',
        '{N} mentioned concerns relating to {poss} social interaction or communication.',
      ],
      i: [
        'Concerns were noted regarding {N}\'s social interaction or communication with others.',
        'It was reported that there had been difficulties with {N}\'s social communication or interaction.',
        '{N}\'s parent/carer raised concerns about {N}\'s social interaction or communication with others.',
        'It was indicated that concerns had been noted regarding {N}\'s social communication.',
        'Concerns relating to {N}\'s social interaction and communication with others were reported.',
      ],
    },
  },

  '2.1.3b': {
    yes: {
      d: [
        '{N} reported having been seen by a professional regarding {poss} social communication difficulties.',
        '{N} indicated that a professional had been involved regarding {poss} social communication.',
        '{N} noted that {poss} social communication difficulties had led to a professional referral.',
        '{N} described having received a professional assessment related to {poss} social interaction.',
        '{N} mentioned having been seen by a professional to discuss {poss} social communication.',
      ],
      i: [
        'It was reported that {N} had been seen by a professional regarding {poss} social communication difficulties.',
        '{N}\'s parent/carer noted that {N} had been assessed by a professional for social communication difficulties.',
        'Professional involvement had been sought in relation to {N}\'s social communication, as reported.',
        'It was indicated that {N} had been referred to a professional regarding {poss} social interaction.',
        '{N}\'s social communication difficulties had been the subject of professional involvement, as reported.',
      ],
    },
  },

  // ── 2.2 Motor Coordination ────────────────────────────────────────────────────

  '2.2.1': {
    yes: {
      d: [
        '{N} reported concerns about {poss} physical development, including balance or general coordination.',
        '{N} described difficulties with physical development such as balance or coordination.',
        '{N} indicated that there had been concerns about {poss} physical development or general coordination.',
        '{N} noted concerns relating to {poss} physical development and coordination in early childhood.',
        '{N} mentioned having had difficulties with physical development, balance, or general coordination.',
      ],
      i: [
        'Concerns were noted regarding {N}\'s physical development, including balance or general coordination.',
        'It was reported that {N} had experienced difficulties with physical development or general coordination.',
        '{N}\'s parent/carer indicated concerns about {N}\'s physical development and coordination.',
        'According to parental report, {N}\'s physical development and coordination had given rise to concerns.',
        'It was noted that concerns had been raised regarding {N}\'s physical development and general coordination.',
      ],
    },
  },

  '2.2.2': {
    yes: {
      d: [
        '{N} reported concerns about {poss} fine motor skills, such as handwriting or practical tasks.',
        '{N} described difficulties with fine motor skills, including holding a pencil or using scissors.',
        '{N} indicated that there had been concerns about {poss} fine motor skills.',
        '{N} noted difficulties with fine motor tasks such as writing, fastening buttons, or using scissors.',
        '{N} mentioned having had concerns about {poss} fine motor development.',
      ],
      i: [
        'Concerns were noted regarding {N}\'s fine motor skills, including handwriting or practical tasks.',
        'It was reported that {N} had experienced difficulties with fine motor skills.',
        '{N}\'s parent/carer indicated concerns about {N}\'s fine motor development.',
        'According to parental report, {N} had shown difficulties with fine motor tasks such as handwriting.',
        'It was noted that concerns had been raised regarding {N}\'s fine motor skills.',
      ],
    },
  },

  '2.2.3': {
    yes: {
      d: [
        '{N} reported having been assessed for or diagnosed with a coordination difficulty.',
        '{N} indicated that a diagnosis of a coordination difficulty had been made.',
        '{N} described having received a diagnosis related to coordination, such as dyspraxia.',
        '{N} noted having been assessed or diagnosed with a developmental coordination difficulty.',
        '{N} mentioned a prior diagnosis or assessment related to coordination difficulties.',
      ],
      i: [
        'It was reported that {N} had been assessed for or diagnosed with a coordination difficulty.',
        '{N}\'s parent/carer indicated that a coordination difficulty had been identified in {N}.',
        'A diagnosis relating to coordination difficulties, such as dyspraxia, had been reported for {N}.',
        'It was noted that {N} had previously been assessed or diagnosed with a developmental coordination difficulty.',
        'Parental report indicated that {N} had received a diagnosis relating to coordination difficulties.',
      ],
    },
  },

  // ── 2.4 Hearing ───────────────────────────────────────────────────────────────

  '2.4.1': {
    yes: {
      d: [
        '{N} reported having had a hearing test.',
        '{N} indicated that {poss} hearing had been assessed.',
        '{N} noted that a hearing test had been carried out.',
        '{N} described having undergone a hearing test.',
        '{N} mentioned having previously had {poss} hearing tested.',
      ],
      i: [
        'It was reported that {N} had undergone a hearing test.',
        '{N}\'s parent/carer indicated that {N} had had {poss} hearing assessed.',
        'A hearing test had been carried out for {N}, according to parental report.',
        'It was noted that {N} had previously undergone a hearing assessment.',
        'Parental report confirmed that {N} had had a hearing test.',
      ],
    },
    no: {
      d: [
        '{N} reported not having had a formal hearing test.',
        '{N} indicated that {poss} hearing had not been formally assessed.',
        '{N} noted that no hearing test had taken place.',
        '{N} described not having undergone a formal hearing assessment.',
        '{N} mentioned that {poss} hearing had not been tested.',
      ],
      i: [
        'It was reported that {N} had not undergone a hearing test.',
        '{N}\'s parent/carer indicated that {N} had not had {poss} hearing formally assessed.',
        'No formal hearing test had been carried out for {N}, according to parental report.',
        'It was noted that {N} had not previously undergone a formal hearing assessment.',
        'Parental report indicated that {N}\'s hearing had not been formally tested.',
      ],
    },
  },

  '2.4.1a': {
    'No concerns identified': {
      d: [
        '{N} reported that no concerns had been identified following {poss} hearing test.',
        '{N} indicated that {poss} hearing assessment had returned a normal outcome.',
        '{N} noted that no hearing difficulties had been identified following testing.',
        '{N} described the outcome of {poss} hearing test as showing no concerns.',
        '{N} mentioned that {poss} hearing had been assessed with no difficulties identified.',
      ],
      i: [
        'No concerns had been identified following {N}\'s hearing test, according to report.',
        'It was reported that {N}\'s hearing assessment had returned a normal outcome.',
        '{N}\'s parent/carer indicated that no hearing difficulties had been identified on testing.',
        'The outcome of {N}\'s hearing test was reported as showing no concerns.',
        'It was noted that {N}\'s hearing had been assessed and no difficulties had been identified.',
      ],
    },
    'A hearing difficulty was identified': {
      d: [
        '{N} reported that a hearing difficulty had been identified following {poss} hearing test.',
        '{N} indicated that {poss} hearing assessment had identified a difficulty.',
        '{N} noted that a hearing difficulty had been found on testing.',
        '{N} described having had a hearing difficulty identified through assessment.',
        '{N} mentioned that {poss} hearing test had revealed a difficulty.',
      ],
      i: [
        'A hearing difficulty had been identified following {N}\'s hearing test, as reported.',
        'It was reported that {N}\'s hearing assessment had identified a difficulty.',
        '{N}\'s parent/carer indicated that a hearing difficulty had been found in {N}.',
        'The outcome of {N}\'s hearing test was reported as identifying a hearing difficulty.',
        'It was noted that a hearing difficulty had been identified through {N}\'s hearing assessment.',
      ],
    },
  },

  '2.4.2': {
    yes: {
      d: [
        '{N} reported having had repeated ear infections or glue ear.',
        '{N} described a history of repeated ear infections or glue ear.',
        '{N} indicated that {poss} history included repeated ear infections or glue ear.',
        '{N} noted having experienced repeated ear infections or glue ear.',
        '{N} mentioned a past history of ear infections or glue ear.',
      ],
      i: [
        'A history of repeated ear infections or glue ear was reported for {N}.',
        'It was reported that {N} had experienced repeated ear infections or glue ear.',
        '{N}\'s parent/carer indicated that {N} had a history of repeated ear infections or glue ear.',
        'According to parental report, {N} had experienced repeated ear infections or glue ear.',
        'It was noted that {N} had a history of ear infections or glue ear.',
      ],
    },
  },

  // ── 2.5 Attention and Concentration ──────────────────────────────────────────

  '2.5.1': {
    yes: {
      d: [
        '{N} reported concerns about {poss} ability to pay attention or concentrate.',
        '{N} described difficulties with attention and concentration.',
        '{N} indicated concerns relating to {poss} attention or ability to stay focused.',
        '{N} noted difficulties in sustaining attention or concentration.',
        '{N} mentioned having concerns about {poss} attention and concentration.',
      ],
      i: [
        'Concerns were noted regarding {N}\'s ability to pay attention or concentrate.',
        'It was reported that {N} experienced difficulties with attention and concentration.',
        '{N}\'s parent/carer indicated concerns about {N}\'s ability to stay focused.',
        'According to parental report, {N} had experienced difficulties with attention or concentration.',
        'Difficulties with attention and concentration were reported in relation to {N}.',
      ],
    },
  },

  '2.5.1b': {
    yes: {
      d: [
        '{N} reported having been seen by a professional regarding {poss} attention difficulties.',
        '{N} indicated that {poss} attention or concentration difficulties had involved professional support.',
        '{N} noted that a professional had been seen in relation to {poss} attention difficulties.',
        '{N} described having received professional input regarding {poss} attention.',
        '{N} mentioned professional involvement in relation to {poss} attention difficulties.',
      ],
      i: [
        'It was reported that {N} had been seen by a professional about {poss} attention difficulties.',
        '{N}\'s parent/carer noted that a professional had been involved regarding {N}\'s attention.',
        'Professional involvement had been sought in relation to {N}\'s attention difficulties, as reported.',
        'It was indicated that {N} had received professional input regarding {poss} attention difficulties.',
        'A professional had been seen in relation to {N}\'s attention and concentration difficulties, as reported.',
      ],
    },
  },

  // ── 2.6 Other Diagnoses or Referrals ──────────────────────────────────────────

  '2.6.1': {
    yes: {
      d: [
        '{N} reported having received another diagnosis relevant to {poss} learning or development.',
        '{N} indicated that a prior diagnosis relating to learning or development had been made.',
        '{N} described having received a diagnosis relevant to {poss} learning or development.',
        '{N} noted having had a prior diagnosis relevant to {poss} learning or development.',
        '{N} mentioned a prior diagnosis relevant to learning or development.',
      ],
      i: [
        'A prior diagnosis relevant to {N}\'s learning or development was reported.',
        'It was reported that {N} had received a diagnosis relevant to {poss} learning or development.',
        '{N}\'s parent/carer indicated that {N} had previously received a relevant diagnosis.',
        'According to parental report, a diagnosis relevant to {N}\'s learning or development had been made.',
        'It was noted that {N} had received a prior diagnosis relating to {poss} learning or development.',
      ],
    },
  },

  '2.6.2': {
    yes: {
      d: [
        '{N} reported currently awaiting a referral or assessment.',
        '{N} indicated that {poss} was currently awaiting referral or further assessment.',
        '{N} noted being on a waiting list for referral or assessment.',
        '{N} described currently awaiting a referral in relation to {poss} difficulties.',
        '{N} mentioned being in the process of awaiting a referral or assessment.',
      ],
      i: [
        'It was reported that {N} was currently awaiting a referral or assessment.',
        '{N}\'s parent/carer indicated that {N} was awaiting a referral or further assessment.',
        'According to parental report, {N} was currently on a waiting list for referral or assessment.',
        'It was noted that {N} was awaiting referral or further assessment at the time of the assessment.',
        '{N}\'s parent/carer reported that {N} was in the process of awaiting a referral.',
      ],
    },
  },

  // ── 2.7 Sensitive Information ──────────────────────────────────────────────────

  '2.7.1': {
    yes: {
      d: [
        '{N} reported that there had been complications during pregnancy, birth, or the neonatal period.',
        '{N} indicated that {poss} birth history had involved some complications.',
        '{N} noted that complications had occurred during pregnancy, birth, or shortly after birth.',
        '{N} described a history that included complications during pregnancy or the neonatal period.',
        '{N} mentioned that there had been complications associated with {poss} birth or early life.',
      ],
      i: [
        'It was reported that there had been complications during pregnancy, birth, or the neonatal period.',
        '{N}\'s parent/carer indicated that complications had occurred during pregnancy or birth.',
        'Complications during pregnancy, birth, or the neonatal period were reported in {N}\'s history.',
        'According to parental report, complications had arisen during pregnancy, birth, or early life.',
        'It was noted that there had been complications associated with {N}\'s birth or early life.',
      ],
    },
  },

  '2.7.2': {
    yes: {
      d: [
        '{N} reported having an ongoing medical condition or taking regular medication.',
        '{N} described having an ongoing medical condition or receiving regular medication.',
        '{N} indicated the presence of an ongoing medical condition or regular medication use.',
        '{N} noted having an ongoing medical condition that was being managed.',
        '{N} mentioned an ongoing medical condition or regular medication.',
      ],
      i: [
        'An ongoing medical condition or regular medication use was reported for {N}.',
        'It was reported that {N} had an ongoing medical condition or took regular medication.',
        '{N}\'s parent/carer indicated that {N} had an ongoing medical condition or was taking regular medication.',
        'According to parental report, {N} had an ongoing medical condition that was being managed.',
        'It was noted that {N} had an ongoing medical condition or was taking regular medication.',
      ],
    },
  },

  '2.7.3': {
    yes: {
      d: [
        '{N} reported having experienced difficulties with {poss} mental health.',
        '{N} described having experienced mental health difficulties.',
        '{N} indicated that {poss} mental health had been a concern.',
        '{N} noted having experienced difficulties with mental health, such as anxiety or low mood.',
        '{N} mentioned having had mental health difficulties.',
      ],
      i: [
        'It was reported that {N} had experienced difficulties with {poss} mental health.',
        '{N}\'s parent/carer indicated that {N} had experienced mental health difficulties.',
        'Mental health difficulties had been reported in relation to {N}.',
        'According to parental report, {N} had experienced difficulties with mental health.',
        'It was noted that {N} had experienced mental health concerns such as anxiety or low mood.',
      ],
    },
  },

  '2.7.3b': {
    yes: {
      d: [
        '{N} reported having received support for {poss} mental health difficulties.',
        '{N} described having received professional support for {poss} mental health.',
        '{N} indicated that {poss} mental health difficulties had been supported professionally.',
        '{N} noted having received support in relation to {poss} mental health.',
        '{N} mentioned having received mental health support or treatment.',
      ],
      i: [
        'It was reported that {N} had received support for {poss} mental health difficulties.',
        '{N}\'s parent/carer indicated that {N} had received professional mental health support.',
        'Support had been provided for {N}\'s mental health difficulties, as reported.',
        'According to parental report, {N} had received support in relation to {poss} mental health.',
        'It was noted that {N} had received support or treatment for {poss} mental health difficulties.',
      ],
    },
  },

  '2.7.4': {
    yes: {
      d: [
        '{N} reported having experienced significant life events that may have affected {poss} learning.',
        '{N} described significant life events or adverse experiences relevant to {poss} development.',
        '{N} indicated that significant life experiences may have had an impact on {poss} learning.',
        '{N} noted that certain life events had potentially affected {poss} learning or development.',
        '{N} mentioned significant life events that {poss} felt were relevant to {poss} development.',
      ],
      i: [
        'It was reported that {N} had experienced significant life events relevant to {poss} learning or development.',
        '{N}\'s parent/carer indicated that significant life experiences had potentially affected {N}.',
        'Significant life events with potential impact on {N}\'s learning or development were reported.',
        'According to parental report, {N} had experienced significant life events relevant to {poss} development.',
        'It was noted that {N}\'s learning or development may have been affected by significant life events.',
      ],
    },
  },

  // ── Section 3: Family History ──────────────────────────────────────────────────

  '3.1': {
    yes: {
      d: [
        '{N} reported a family history of reading, writing, or spelling difficulties.',
        '{N} described a history of literacy difficulties within {poss} close family.',
        '{N} indicated that reading, writing, or spelling difficulties were present in {poss} close family.',
        '{N} noted a family history of difficulties with reading, writing, or spelling.',
        '{N} mentioned that literacy difficulties had been evident in {poss} close family.',
      ],
      i: [
        'A family history of reading, writing, or spelling difficulties was reported.',
        'It was reported that {N}\'s close family had a history of literacy difficulties.',
        '{N}\'s parent/carer indicated that reading, writing, or spelling difficulties were present in the close family.',
        'According to parental report, there was a family history of difficulties with reading, writing, or spelling.',
        'It was noted that literacy difficulties had been evident in {N}\'s close family.',
      ],
    },
    'not sure': {
      d: [
        '{N} was uncertain as to whether there was a family history of literacy difficulties.',
        '{N} indicated uncertainty about whether literacy difficulties ran in {poss} family.',
        '{N} noted that it was unclear whether reading, writing, or spelling difficulties existed in {poss} family.',
        '{N} reported being unsure of any family history of literacy difficulties.',
        '{N} was unable to confirm a family history of reading, writing, or spelling difficulties.',
      ],
      i: [
        'Uncertainty was reported regarding a family history of literacy difficulties.',
        'It was reported that it was unclear whether {N}\'s family had a history of literacy difficulties.',
        '{N}\'s parent/carer indicated uncertainty about a family history of reading, writing, or spelling difficulties.',
        'According to parental report, it was unclear whether literacy difficulties ran in the family.',
        'It was noted that there was uncertainty regarding a family history of literacy difficulties.',
      ],
    },
  },

  '3.2': {
    yes: {
      d: [
        '{N} reported a family history of difficulties with mathematics or numbers.',
        '{N} described a history of maths or numeracy difficulties within {poss} close family.',
        '{N} indicated that difficulties with mathematics or numbers were present in {poss} close family.',
        '{N} noted a family history of difficulties with maths or arithmetic.',
        '{N} mentioned that mathematical difficulties had been evident in {poss} close family.',
      ],
      i: [
        'A family history of difficulties with mathematics or numbers was reported.',
        'It was reported that {N}\'s close family had a history of difficulties with maths or numeracy.',
        '{N}\'s parent/carer indicated that difficulties with mathematics were present in the close family.',
        'According to parental report, there was a family history of difficulties with mathematics or numbers.',
        'It was noted that difficulties with maths or numeracy had been evident in {N}\'s close family.',
      ],
    },
  },

  '3.3': {
    yes: {
      d: [
        '{N} reported that a close family member had been diagnosed with a specific learning difficulty or developmental condition.',
        '{N} described a family history that included a diagnosis of a specific learning difficulty.',
        '{N} indicated that a specific learning difficulty or developmental condition had been diagnosed in a close family member.',
        '{N} noted that {poss} close family included at least one member with a diagnosis of a specific learning difficulty.',
        '{N} mentioned a family history of diagnosed specific learning difficulties or developmental conditions.',
      ],
      i: [
        'A family history of diagnosed specific learning difficulties or developmental conditions was reported.',
        'It was reported that a close family member had been diagnosed with a specific learning difficulty or developmental condition.',
        '{N}\'s parent/carer indicated that a specific learning difficulty or developmental condition had been diagnosed in the close family.',
        'According to parental report, at least one close family member had a diagnosis of a specific learning difficulty.',
        'It was noted that there was a family history of diagnosed specific learning difficulties or developmental conditions.',
      ],
    },
  },

  // ── Section 4: Linguistic History ─────────────────────────────────────────────

  '4.1': {
    yes: {
      d: [
        '{N} reported that English was {poss} first and only language.',
        '{N} indicated that {poss} background was monolingual, with English as {poss} only language.',
        '{N} confirmed that English was the only language spoken at home during {poss} upbringing.',
        '{N} noted that {poss} linguistic background was English only.',
        '{N} described growing up in an English-only language environment.',
      ],
      i: [
        'It was reported that English was {N}\'s first and only language.',
        '{N}\'s parent/carer confirmed that English was the only language spoken in the home.',
        'A monolingual English-speaking background was reported for {N}.',
        'According to parental report, English was {N}\'s first and only language.',
        'It was noted that {N} had grown up in an English-only language environment.',
      ],
    },
    no: {
      d: [
        '{N} reported that English was not {poss} first or only language.',
        '{N} described a multilingual or bilingual background.',
        '{N} indicated that languages other than English were or had been spoken in {poss} home.',
        '{N} noted a linguistic background that included languages in addition to English.',
        '{N} mentioned having a multilingual background, with English as an additional language.',
      ],
      i: [
        'It was reported that English was not {N}\'s first or only language.',
        '{N}\'s parent/carer indicated that {N} had a multilingual or bilingual background.',
        'A multilingual background was reported for {N}, with languages other than English having been spoken in the home.',
        'According to parental report, {N}\'s linguistic background was not monolingual English.',
        'It was noted that {N} had a multilingual background, with exposure to languages other than English.',
      ],
    },
  },

  '4.1f': {
    yes: {
      d: [
        '{N} reported having experienced difficulties with reading, writing, spelling, or maths in {poss} first language.',
        '{N} described literacy or numeracy difficulties that extended to {poss} first language.',
        '{N} indicated that difficulties with reading, writing, or spelling had been evident in {poss} first language.',
        '{N} noted having had difficulties with literacy or maths in {poss} first language.',
        '{N} mentioned experiencing literacy or numeracy difficulties in {poss} first language.',
      ],
      i: [
        'It was reported that {N} had experienced difficulties with reading, writing, spelling, or maths in {poss} first language.',
        '{N}\'s parent/carer indicated that difficulties with literacy or numeracy had been evident in {N}\'s first language.',
        'Literacy or numeracy difficulties in {N}\'s first language were reported.',
        'According to parental report, {N} had experienced difficulties with literacy or maths in {poss} first language.',
        'It was noted that {N}\'s literacy or numeracy difficulties extended to {poss} first language.',
      ],
    },
  },

  // ── Section 5 (16+): Educational and Work History ────────────────────────────

  '5.0': {
    'In school/sixth form': {
      d: [
        '{N} reported currently being in school or sixth form.',
        '{N} indicated that {poss} current situation was as a school or sixth form student.',
        '{N} was currently in school or sixth form at the time of assessment.',
        '{N} noted currently being in school or sixth form education.',
        '{N} described {poss} current situation as being in school or sixth form.',
      ],
      i: [],
    },
    'In further education (college)': {
      d: [
        '{N} reported currently being in further education at college.',
        '{N} indicated that {poss} current situation was as a college student.',
        '{N} was currently attending college at the time of assessment.',
        '{N} noted being in further education at the time of assessment.',
        '{N} described {poss} current situation as a student in further education.',
      ],
      i: [],
    },
    'In higher education (university)': {
      d: [
        '{N} reported currently being in higher education at university.',
        '{N} indicated that {poss} current situation was as a university student.',
        '{N} was currently attending university at the time of assessment.',
        '{N} noted being in higher education at the time of assessment.',
        '{N} described {poss} current situation as a student in higher education.',
      ],
      i: [],
    },
    'In employment': {
      d: [
        '{N} reported currently being in employment.',
        '{N} indicated that {poss} current situation was one of employment.',
        '{N} was currently in employment at the time of assessment.',
        '{N} noted being employed at the time of assessment.',
        '{N} described {poss} current situation as being in employment.',
      ],
      i: [],
    },
    'In an apprenticeship or training': {
      d: [
        '{N} reported currently being in an apprenticeship or training programme.',
        '{N} indicated that {poss} current situation was an apprenticeship or training.',
        '{N} was currently engaged in an apprenticeship or training at the time of assessment.',
        '{N} noted being in an apprenticeship or training programme.',
        '{N} described {poss} current situation as being in an apprenticeship or training.',
      ],
      i: [],
    },
  },

  '5.2': {
    no: {
      d: [
        '{N} reported that {poss} school attendance had not been consistent.',
        '{N} described having experienced periods of disrupted school attendance.',
        '{N} indicated that {poss} attendance at school had been inconsistent.',
        '{N} noted that {poss} school attendance had not been regular throughout {poss} education.',
        '{N} mentioned having had disrupted school attendance.',
      ],
      i: [
        'It was reported that {N}\'s school attendance had not been consistent.',
        '{N}\'s parent/carer indicated that {N} had experienced periods of disrupted school attendance.',
        'Disrupted school attendance was reported in relation to {N}.',
        'According to parental report, {N}\'s school attendance had been inconsistent.',
        'It was noted that {N}\'s attendance at school had not been regular.',
      ],
    },
  },

  '5.3': {
    yes: {
      d: [
        '{N} reported that {poss} education had been significantly affected by the Covid-19 pandemic.',
        '{N} described a significant impact of the Covid-19 pandemic on {poss} education.',
        '{N} indicated that the Covid-19 pandemic had meaningfully disrupted {poss} schooling.',
        '{N} noted that {poss} education had been considerably affected by the pandemic.',
        '{N} mentioned that the Covid-19 pandemic had had a significant impact on {poss} learning.',
      ],
      i: [
        'It was reported that {N}\'s education had been significantly affected by the Covid-19 pandemic.',
        '{N}\'s parent/carer indicated that the Covid-19 pandemic had had a significant impact on {N}\'s education.',
        'A significant disruption to {N}\'s education as a result of the Covid-19 pandemic was reported.',
        'According to parental report, {N}\'s schooling had been considerably affected by the pandemic.',
        'It was noted that the Covid-19 pandemic had meaningfully disrupted {N}\'s education.',
      ],
    },
  },

  '5.4': {
    yes: {
      // 16+ version: "Do you know your GCSE/A-level results?"
      d: [
        '{N} reported knowing {poss} results from school assessments such as GCSEs or A-levels.',
        '{N} indicated that {poss} results from formal school assessments were known.',
        '{N} noted being aware of {poss} results from school qualifications.',
        '{N} described knowing {poss} results from previous school assessments.',
        '{N} mentioned having knowledge of {poss} results from school qualifications.',
      ],
      i: [],
    },
    // Under-16 phonics screening options
    'Yes - they passed': {
      d: [],
      i: [
        'It was reported that {N} had passed the Year 1 or Year 2 phonics screening check.',
        '{N}\'s parent/carer indicated that {N} had passed the phonics screening check.',
        'According to parental report, {N} had been successful in the phonics screening check.',
        'It was noted that {N} had passed the phonics screening check.',
        'The phonics screening check was reported as having been passed by {N}.',
      ],
    },
    'Yes - they did not pass': {
      d: [],
      i: [
        'It was reported that {N} had not passed the Year 1 or Year 2 phonics screening check.',
        '{N}\'s parent/carer indicated that {N} had not passed the phonics screening check.',
        'According to parental report, {N} had been unsuccessful in the phonics screening check.',
        'It was noted that {N} had not passed the phonics screening check at Year 1 or Year 2.',
        'The phonics screening check was reported as not having been passed by {N}.',
      ],
    },
  },

  '5.5': {
    yes: {
      d: [],
      i: [
        'It was reported that {N}\'s results from end-of-year or end-of-phase assessments were known.',
        '{N}\'s parent/carer indicated that the results of statutory assessments such as SATs were available.',
        'Results from end-of-phase assessments were reported as known.',
        'According to parental report, the results of statutory school assessments were available.',
        'It was noted that {N}\'s results from national or end-of-phase assessments were known.',
      ],
    },
  },

  // ── Section 5: Learning Support ────────────────────────────────────────────────

  '5.LS.1': {
    yes: {
      d: [
        '{N} reported having received additional learning support at school or college.',
        '{N} described having been provided with additional learning support.',
        '{N} indicated that additional support had been put in place for {poss} learning.',
        '{N} noted having received additional learning support during {poss} school years.',
        '{N} mentioned having had additional learning support at school or college.',
      ],
      i: [
        'It was reported that {N} had received additional learning support at school.',
        '{N}\'s parent/carer indicated that {N} had been provided with additional learning support.',
        'Additional learning support had been provided for {N} at school, as reported.',
        'According to parental report, {N} had received additional learning support.',
        'It was noted that additional support had been put in place for {N}\'s learning.',
      ],
    },
  },

  '5.LS.1b': {
    'Yes, it helped a lot': {
      d: [
        '{N} reported that the support had been very helpful.',
        '{N} indicated that the learning support provided had helped a great deal.',
        '{N} noted that the support received had been of considerable benefit.',
        '{N} described the learning support as having been very helpful.',
        '{N} felt that the additional support had made a significant difference.',
      ],
      i: [
        'It was reported that the learning support had been very helpful for {N}.',
        '{N}\'s parent/carer indicated that the support provided had helped {N} a great deal.',
        'The learning support was reported as having been of considerable benefit to {N}.',
        'According to parental report, the support provided had made a significant difference for {N}.',
        'It was noted that the additional support had been very beneficial for {N}.',
      ],
    },
    'It helped a little': {
      d: [
        '{N} reported that the support had been of some benefit.',
        '{N} indicated that the learning support had helped to some extent.',
        '{N} noted that the support received had made a partial difference.',
        '{N} described the learning support as having been of limited but some benefit.',
        '{N} felt that the additional support had helped a little.',
      ],
      i: [
        'It was reported that the learning support had been of some benefit to {N}.',
        '{N}\'s parent/carer indicated that the support provided had helped {N} to some extent.',
        'The learning support was reported as having made a partial difference for {N}.',
        'According to parental report, the support had been of some benefit to {N}.',
        'It was noted that the additional support had helped {N} to a limited extent.',
      ],
    },
    'It did not seem to help': {
      d: [
        '{N} reported that the support had not appeared to be helpful.',
        '{N} indicated that the learning support had not seemed to make a difference.',
        '{N} noted that the support received did not appear to have been beneficial.',
        '{N} described the learning support as not having seemed to help.',
        '{N} felt that the additional support had not made a meaningful difference.',
      ],
      i: [
        'It was reported that the learning support had not appeared to be helpful for {N}.',
        '{N}\'s parent/carer indicated that the support provided had not seemed to make a difference.',
        'The learning support was reported as not having appeared to be of benefit to {N}.',
        'According to parental report, the support had not seemed to help {N}.',
        'It was noted that the additional support had not appeared to have been beneficial for {N}.',
      ],
    },
  },

  '5.LS.2': {
    'Yes - SEN Support': {
      d: [
        '{N} reported having had SEN Support status.',
        '{N} indicated that {poss} SEN status was at the SEN Support level.',
        '{N} noted having been on SEN Support.',
        '{N} described having had SEN Support in place.',
        '{N} mentioned having had SEN Support status during {poss} education.',
      ],
      i: [
        'It was reported that {N} had had SEN Support status.',
        '{N}\'s parent/carer indicated that {N} was or had been on SEN Support.',
        'SEN Support status had been reported for {N}.',
        'According to parental report, {N} had had SEN Support in place.',
        'It was noted that {N} had had SEN Support status during {poss} education.',
      ],
    },
    'Yes - EHCP (or Statement)': {
      d: [
        '{N} reported having an Education, Health and Care Plan (EHCP) or Statement of Special Educational Needs.',
        '{N} indicated that {poss} SEN status included an EHCP or Statement.',
        '{N} noted having had an EHCP or Statement in place.',
        '{N} described having had an EHCP or Statement of Special Educational Needs.',
        '{N} mentioned having an EHCP or Statement as part of {poss} educational provision.',
      ],
      i: [
        'It was reported that {N} had an Education, Health and Care Plan (EHCP) or Statement of Special Educational Needs.',
        '{N}\'s parent/carer indicated that {N} had an EHCP or Statement in place.',
        'An EHCP or Statement of Special Educational Needs was reported for {N}.',
        'According to parental report, {N} had an EHCP or Statement as part of {poss} educational provision.',
        'It was noted that {N} had an EHCP or Statement of Special Educational Needs.',
      ],
    },
  },

  '5.LS.3': {
    yes: {
      d: [
        '{N} reported having received additional support outside of school or college.',
        '{N} described receiving additional support outside of school, such as private tuition.',
        '{N} indicated that additional support had been provided outside of school.',
        '{N} noted having received outside-school support, such as specialist tuition.',
        '{N} mentioned having had additional support outside of the school or college setting.',
      ],
      i: [
        'It was reported that {N} had received additional support outside of school.',
        '{N}\'s parent/carer indicated that {N} had received additional support outside of school, such as private tuition.',
        'Additional outside-school support had been provided for {N}, as reported.',
        'According to parental report, {N} had received support outside of school, such as specialist tuition.',
        'It was noted that {N} had received additional support outside of the school setting.',
      ],
    },
  },

  '5.PA.1': {
    yes: {
      d: [
        '{N} reported having had a previous assessment related to {poss} learning.',
        '{N} described having previously been assessed in relation to {poss} learning.',
        '{N} indicated that a previous learning-related assessment had taken place.',
        '{N} noted having previously undergone a learning assessment.',
        '{N} mentioned that a prior assessment related to {poss} learning had been carried out.',
      ],
      i: [
        'It was reported that {N} had previously been assessed in relation to {poss} learning.',
        '{N}\'s parent/carer indicated that a previous learning-related assessment had taken place.',
        'A prior assessment related to {N}\'s learning had been reported.',
        'According to parental report, {N} had undergone a previous learning assessment.',
        'It was noted that {N} had previously had an assessment related to {poss} learning.',
      ],
    },
  },

  '5.PA.2': {
    yes: {
      d: [
        '{N} reported having exam access arrangements in place.',
        '{N} indicated that exam access arrangements were currently in place.',
        '{N} noted that exam access arrangements had been provided.',
        '{N} described having access arrangements for examinations.',
        '{N} mentioned having exam access arrangements, such as extra time or a reader.',
      ],
      i: [
        'It was reported that {N} had exam access arrangements in place.',
        '{N}\'s parent/carer indicated that {N} had exam access arrangements currently in place.',
        'Exam access arrangements had been reported for {N}.',
        'According to parental report, {N} had access arrangements in place for examinations.',
        'It was noted that exam access arrangements had been provided for {N}.',
      ],
    },
  },

  '5.AL.1': {
    yes: {
      d: [
        '{N} reported experiencing anxiety or distress related to learning.',
        '{N} described experiencing anxiety in relation to particular subjects or activities.',
        '{N} indicated that anxiety or distress was associated with certain aspects of learning.',
        '{N} noted experiencing learning-related anxiety or distress.',
        '{N} mentioned having anxiety or distress in relation to specific subjects or activities.',
      ],
      i: [
        'It was reported that {N} experienced anxiety or distress related to learning.',
        '{N}\'s parent/carer indicated that {N} experienced anxiety in relation to particular subjects or activities.',
        'Learning-related anxiety or distress had been reported in relation to {N}.',
        'According to parental report, {N} experienced anxiety or distress associated with certain aspects of learning.',
        'It was noted that {N} experienced anxiety or distress related to specific school subjects or activities.',
      ],
    },
  },

  // ── Section 6: Current Situation ───────────────────────────────────────────────

  '6.LIT.1': {
    yes: {
      d: [
        '{N} reported concerns about {poss} reading.',
        '{N} described having difficulties with reading.',
        '{N} indicated that reading was a current area of concern.',
        '{N} noted having concerns about {poss} reading.',
        '{N} mentioned experiencing difficulties with reading.',
      ],
      i: [
        'Concerns were noted regarding {N}\'s reading.',
        'It was reported that {N} experienced difficulties with reading.',
        '{N}\'s parent/carer indicated that reading was a current area of concern for {N}.',
        'Reading difficulties were reported in relation to {N}.',
        'It was noted that {N} had concerns about {poss} reading.',
      ],
    },
  },

  '6.LIT.2': {
    yes: {
      d: [
        '{N} reported concerns about {poss} writing or spelling.',
        '{N} described having difficulties with writing or spelling.',
        '{N} indicated that writing or spelling was a current area of concern.',
        '{N} noted having concerns about {poss} writing or spelling.',
        '{N} mentioned experiencing difficulties with writing or spelling.',
      ],
      i: [
        'Concerns were noted regarding {N}\'s writing or spelling.',
        'It was reported that {N} experienced difficulties with writing or spelling.',
        '{N}\'s parent/carer indicated that writing or spelling was a current area of concern for {N}.',
        'Writing or spelling difficulties were reported in relation to {N}.',
        'It was noted that {N} had concerns about {poss} writing or spelling.',
      ],
    },
  },

  '6.LIT.3': {
    yes: {
      d: [
        '{N} reported having received targeted help for reading, writing, or spelling.',
        '{N} described having received specialist support for literacy.',
        '{N} indicated that targeted support had been provided for {poss} reading, writing, or spelling.',
        '{N} noted having received targeted literacy support.',
        '{N} mentioned having received help specifically aimed at improving literacy skills.',
      ],
      i: [
        'It was reported that {N} had received targeted help for reading, writing, or spelling.',
        '{N}\'s parent/carer indicated that {N} had received specialist literacy support.',
        'Targeted literacy support had been provided for {N}, as reported.',
        'According to parental report, {N} had received targeted help for reading, writing, or spelling.',
        'It was noted that {N} had received support specifically aimed at improving {poss} literacy.',
      ],
    },
  },

  '6.LIT.4': {
    yes: {
      d: [
        '{N} reported difficulty keeping up with tasks requiring reading, writing, and listening simultaneously.',
        '{N} described finding it difficult to manage tasks involving listening and writing at the same time.',
        '{N} indicated difficulty with activities that required reading, writing, or listening concurrently.',
        '{N} noted difficulty keeping pace with note-taking or similar tasks that combined multiple processes.',
        '{N} mentioned difficulty with tasks such as note-taking, where reading, writing, and listening were required simultaneously.',
      ],
      i: [],
    },
  },

  '6.MA.1': {
    yes: {
      d: [
        '{N} reported concerns about {poss} maths or arithmetic skills.',
        '{N} described having difficulties with maths or arithmetic.',
        '{N} indicated that maths or arithmetic was a current area of concern.',
        '{N} noted having concerns about {poss} mathematical skills.',
        '{N} mentioned experiencing difficulties with maths or arithmetic.',
      ],
      i: [
        'Concerns were noted regarding {N}\'s maths or arithmetic skills.',
        'It was reported that {N} experienced difficulties with maths or arithmetic.',
        '{N}\'s parent/carer indicated that maths or arithmetic was a current area of concern for {N}.',
        'Maths or arithmetic difficulties were reported in relation to {N}.',
        'It was noted that {N} had concerns about {poss} mathematical skills.',
      ],
    },
  },

  // ── Visual Questionnaire ────────────────────────────────────────────────────────

  'vh.1': {
    yes: {
      d: [
        '{N} reported having been prescribed glasses or contact lenses.',
        '{N} indicated that {poss} had been prescribed optical prescription lenses.',
        '{N} noted having been prescribed glasses or contact lenses.',
        '{N} described having a prescription for glasses or contact lenses.',
        '{N} mentioned having been advised to wear glasses or contact lenses.',
      ],
      i: [
        'It was reported that {N} had been prescribed glasses or contact lenses.',
        '{N}\'s parent/carer indicated that {N} had been prescribed optical prescription lenses.',
        'Prescription glasses or contact lenses had been prescribed for {N}, as reported.',
        'According to parental report, {N} had been prescribed glasses or contact lenses.',
        'It was noted that {N} had been advised to wear glasses or contact lenses.',
      ],
    },
    no: {
      d: [
        '{N} reported not having been prescribed glasses or contact lenses.',
        '{N} indicated that no optical prescription lenses had been prescribed.',
        '{N} noted that no glasses or contact lenses had been prescribed.',
        '{N} described not having a prescription for glasses or contact lenses.',
        '{N} mentioned not having been advised to wear glasses or contact lenses.',
      ],
      i: [
        'It was reported that {N} had not been prescribed glasses or contact lenses.',
        '{N}\'s parent/carer indicated that {N} had not been prescribed optical prescription lenses.',
        'No prescription glasses or contact lenses had been prescribed for {N}, as reported.',
        'According to parental report, {N} had not been prescribed glasses or contact lenses.',
        'It was noted that {N} had not been advised to wear glasses or contact lenses.',
      ],
    },
  },

  'vh.1a': {
    'Distance vision': {
      d: [
        '{N} reported that {poss} lenses were prescribed for distance vision.',
        '{N} indicated that {poss} glasses or contact lenses were for distance vision.',
        '{N} noted that {poss} prescription was for distance vision.',
        '{N} described {poss} lenses as being prescribed for distance vision only.',
        '{N} mentioned that {poss} glasses or contact lenses were for distance vision.',
      ],
      i: [
        'It was reported that {N}\'s lenses were prescribed for distance vision.',
        'Prescription lenses for distance vision had been reported for {N}.',
        'According to parental report, {N}\'s glasses or contact lenses were for distance vision.',
        'It was noted that {N}\'s prescription was for distance vision.',
        '{N}\'s lenses were reported as being prescribed for distance vision.',
      ],
    },
    'Near vision': {
      d: [
        '{N} reported that {poss} lenses were prescribed for near vision.',
        '{N} indicated that {poss} glasses or contact lenses were for near vision, such as reading.',
        '{N} noted that {poss} prescription was for near vision.',
        '{N} described {poss} lenses as being prescribed for near vision only.',
        '{N} mentioned that {poss} glasses or contact lenses were for near vision.',
      ],
      i: [
        'It was reported that {N}\'s lenses were prescribed for near vision.',
        'Prescription lenses for near vision had been reported for {N}.',
        'According to parental report, {N}\'s glasses or contact lenses were for near vision.',
        'It was noted that {N}\'s prescription was for near vision.',
        '{N}\'s lenses were reported as being prescribed for near vision.',
      ],
    },
    'Both': {
      d: [
        '{N} reported that {poss} lenses were prescribed for both distance and near vision.',
        '{N} indicated that {poss} glasses or contact lenses were required for both distance and near vision.',
        '{N} noted that {poss} prescription covered both distance and near vision.',
        '{N} described {poss} lenses as being prescribed for both distance and near vision.',
        '{N} mentioned that {poss} glasses or contact lenses were required for distance and near vision.',
      ],
      i: [
        'It was reported that {N}\'s lenses were prescribed for both distance and near vision.',
        'Prescription lenses for both distance and near vision had been reported for {N}.',
        'According to parental report, {N}\'s glasses or contact lenses were for both distance and near vision.',
        'It was noted that {N}\'s prescription covered both distance and near vision.',
        '{N}\'s lenses were reported as being prescribed for both distance and near vision.',
      ],
    },
  },

  'vh.1b': {
    no: {
      d: [
        '{N} reported not wearing {poss} glasses or contact lenses as advised.',
        '{N} indicated that {poss} was not wearing {poss} lenses as recommended.',
        '{N} noted not wearing {poss} glasses or contact lenses as prescribed.',
        '{N} described not consistently following the advice to wear {poss} glasses or contact lenses.',
        '{N} mentioned not wearing {poss} glasses or contact lenses as advised.',
      ],
      i: [
        'It was reported that {N} was not wearing {poss} glasses or contact lenses as advised.',
        '{N}\'s parent/carer indicated that {N} was not wearing {poss} lenses as recommended.',
        'Non-compliance with wearing prescribed lenses was reported in relation to {N}.',
        'According to parental report, {N} was not wearing {poss} glasses or contact lenses as advised.',
        'It was noted that {N} was not consistently wearing {poss} prescribed glasses or contact lenses.',
      ],
    },
  },

  'vh.2': {
    'Less than 2 years ago': {
      d: [
        '{N} reported having had a sight test within the last two years.',
        '{N} indicated that {poss} most recent eye test had taken place within the last two years.',
        '{N} noted that {poss} last sight test had been within the past two years.',
        '{N} described having had a recent eye test, within the last two years.',
        '{N} mentioned that {poss} last eye test had taken place less than two years ago.',
      ],
      i: [
        'It was reported that {N} had had a sight test within the last two years.',
        '{N}\'s parent/carer indicated that {N}\'s most recent eye test had been within the last two years.',
        'A sight test within the past two years was reported for {N}.',
        'According to parental report, {N}\'s last eye test had taken place within the last two years.',
        'It was noted that {N} had had a recent eye test, within the past two years.',
      ],
    },
    'More than 2 years ago': {
      d: [
        '{N} reported that {poss} last sight test had been more than two years ago.',
        '{N} indicated that {poss} most recent eye test had taken place more than two years previously.',
        '{N} noted that it had been more than two years since {poss} last eye test.',
        '{N} described {poss} last eye test as having taken place over two years ago.',
        '{N} mentioned that {poss} most recent sight test had been over two years ago.',
      ],
      i: [
        'It was reported that {N}\'s last sight test had been more than two years ago.',
        '{N}\'s parent/carer indicated that {N}\'s most recent eye test had taken place more than two years ago.',
        'A sight test more than two years ago was reported for {N}.',
        'According to parental report, {N}\'s last eye test had been over two years ago.',
        'It was noted that it had been more than two years since {N}\'s last eye test.',
      ],
    },
    'Never': {
      d: [
        '{N} reported having never had a sight test.',
        '{N} indicated that {poss} eyes had never been formally tested.',
        '{N} noted that no eye test had ever been carried out.',
        '{N} described never having had a sight test by an optometrist.',
        '{N} mentioned never having had {poss} eyes formally tested.',
      ],
      i: [
        'It was reported that {N} had never had a sight test.',
        '{N}\'s parent/carer indicated that {N} had never had {poss} eyes formally tested.',
        'No previous eye test was reported for {N}.',
        'According to parental report, {N} had never had a sight test.',
        'It was noted that {N} had never undergone a formal eye test.',
      ],
    },
  },

  'vh.3': {
    yes: {
      d: [
        '{N} reported having previously used coloured overlays or precision-tinted lenses.',
        '{N} indicated that {poss} had used coloured overlays or tinted lenses in the past.',
        '{N} noted having had experience with coloured overlays or precision-tinted lenses.',
        '{N} described having previously used coloured overlays or tinted lenses.',
        '{N} mentioned having used coloured overlays or precision-tinted lenses at some point.',
      ],
      i: [
        'It was reported that {N} had previously used coloured overlays or precision-tinted lenses.',
        '{N}\'s parent/carer indicated that {N} had used coloured overlays or tinted lenses.',
        'Previous use of coloured overlays or precision-tinted lenses was reported for {N}.',
        'According to parental report, {N} had experience with coloured overlays or precision-tinted lenses.',
        'It was noted that {N} had previously used coloured overlays or precision-tinted lenses.',
      ],
    },
  },

  'vh.3c': {
    yes: {
      d: [
        '{N} reported that the coloured overlays or tinted lenses had been helpful.',
        '{N} indicated that {poss} use of coloured overlays or tinted lenses had been beneficial.',
        '{N} noted that the overlays or tinted lenses had made a positive difference.',
        '{N} described the coloured overlays or tinted lenses as having been helpful.',
        '{N} mentioned that the overlays or lenses had proved to be beneficial.',
      ],
      i: [
        'It was reported that the coloured overlays or tinted lenses had been helpful for {N}.',
        '{N}\'s parent/carer indicated that the overlays or lenses had been of benefit to {N}.',
        'The coloured overlays or tinted lenses were reported as having been helpful for {N}.',
        'According to parental report, the overlays or tinted lenses had proved beneficial for {N}.',
        'It was noted that the coloured overlays or tinted lenses had been of benefit to {N}.',
      ],
    },
  },

  'vh.3d': {
    no: {
      d: [
        '{N} reported no longer using {poss} coloured overlays or tinted lenses.',
        '{N} indicated that {poss} had stopped using the coloured overlays or tinted lenses.',
        '{N} noted that {poss} was no longer using the overlays or tinted lenses.',
        '{N} described having ceased to use the coloured overlays or tinted lenses.',
        '{N} mentioned that {poss} use of the coloured overlays or tinted lenses had ended.',
      ],
      i: [
        'It was reported that {N} was no longer using the coloured overlays or tinted lenses.',
        '{N}\'s parent/carer indicated that {N} had stopped using the overlays or tinted lenses.',
        'Discontinuation of coloured overlays or tinted lenses was reported for {N}.',
        'According to parental report, {N} was no longer using the coloured overlays or tinted lenses.',
        'It was noted that {N}\'s use of coloured overlays or tinted lenses had ended.',
      ],
    },
  },

  'vh.4': {
    yes: {
      d: [
        '{N} reported having received hospital treatment for a problem with {poss} eyes or vision.',
        '{N} indicated that {poss} had received hospital treatment for an eye or vision problem.',
        '{N} noted having had hospital involvement for an eye or vision condition.',
        '{N} described having received hospital treatment in relation to {poss} eyes or vision.',
        '{N} mentioned having had hospital treatment for a problem with {poss} eyes or vision.',
      ],
      i: [
        'It was reported that {N} had received hospital treatment for a problem with {poss} eyes or vision.',
        '{N}\'s parent/carer indicated that {N} had received hospital treatment for an eye or vision condition.',
        'Hospital treatment for an eye or vision problem had been reported for {N}.',
        'According to parental report, {N} had received hospital treatment in relation to {poss} eyes or vision.',
        'It was noted that {N} had previously received hospital treatment for an eye or vision problem.',
      ],
    },
  },

  // ── VDQ ──────────────────────────────────────────────────────────────────────────

  'vdq.1': {
    yes: {
      d: [
        '{N} reported often getting headaches when reading or studying.',
        '{N} described frequently experiencing headaches during reading or study.',
        '{N} indicated that headaches were a common experience during reading or study.',
        '{N} noted often experiencing headaches when reading or engaging in study activities.',
        '{N} mentioned regularly getting headaches when reading or studying.',
      ],
      i: [
        'It was reported that {N} often experienced headaches when reading or studying.',
        '{N}\'s parent/carer indicated that {N} frequently got headaches during reading or study.',
        'Frequent headaches during reading or study were reported in relation to {N}.',
        'According to parental report, {N} often experienced headaches when reading or studying.',
        'It was noted that {N} regularly experienced headaches during reading or study activities.',
      ],
    },
  },

  'vdq.2': {
    yes: {
      d: [
        '{N} reported that {poss} eyes often felt sore, gritty, or watery.',
        '{N} described frequently experiencing sore, gritty, or watery eyes.',
        '{N} indicated that {poss} eyes often felt uncomfortable, including sensations of soreness or grittiness.',
        '{N} noted that {poss} eyes regularly felt sore, gritty, or watery.',
        '{N} mentioned often having sore, gritty, or watery eyes.',
      ],
      i: [
        'It was reported that {N}\'s eyes often felt sore, gritty, or watery.',
        '{N}\'s parent/carer indicated that {N} frequently experienced sore, gritty, or watery eyes.',
        'Frequent soreness, grittiness, or wateriness of the eyes was reported in relation to {N}.',
        'According to parental report, {N}\'s eyes often felt sore, gritty, or watery.',
        'It was noted that {N} regularly experienced sore, gritty, or watery eyes.',
      ],
    },
  },

  'vdq.3': {
    yes: {
      d: [
        '{N} reported often finding reading from white paper or a bright screen uncomfortable.',
        '{N} described frequently experiencing discomfort when reading from white paper or bright screens.',
        '{N} indicated that reading from white paper or bright screens was often uncomfortable.',
        '{N} noted often finding bright paper or screens uncomfortable when reading.',
        '{N} mentioned regularly experiencing discomfort when reading from white paper or bright screens.',
      ],
      i: [
        'It was reported that {N} often found reading from white paper or bright screens uncomfortable.',
        '{N}\'s parent/carer indicated that {N} frequently experienced discomfort when reading from white paper or bright screens.',
        'Frequent discomfort when reading from white paper or bright screens was reported for {N}.',
        'According to parental report, {N} often found bright paper or screens uncomfortable when reading.',
        'It was noted that {N} regularly experienced discomfort reading from white paper or bright screens.',
      ],
    },
  },

  'vdq.4': {
    yes: {
      d: [
        '{N} reported that print often appeared blurred or went in and out of focus when reading.',
        '{N} described frequently experiencing blurred or fluctuating focus when reading.',
        '{N} indicated that print often appeared blurred or shifted in and out of focus during reading.',
        '{N} noted that text often appeared blurred or went in and out of focus when reading.',
        '{N} mentioned regularly experiencing blurred or inconsistent focus when reading.',
      ],
      i: [
        'It was reported that {N} often experienced print appearing blurred or going in and out of focus when reading.',
        '{N}\'s parent/carer indicated that {N} frequently experienced blurred or fluctuating focus when reading.',
        'Frequent blurring or fluctuating focus when reading was reported in relation to {N}.',
        'According to parental report, {N} often experienced print appearing blurred or going in and out of focus.',
        'It was noted that {N} regularly experienced blurred or inconsistent focus when reading.',
      ],
    },
  },

  'vdq.5': {
    yes: {
      d: [
        '{N} reported that print, the book, or the screen often appeared double when reading.',
        '{N} described frequently experiencing double vision when reading.',
        '{N} indicated that text or the screen often appeared double during reading.',
        '{N} noted often seeing double when reading.',
        '{N} mentioned regularly experiencing double vision while reading.',
      ],
      i: [
        'It was reported that {N} often experienced print, book, or screen appearing double when reading.',
        '{N}\'s parent/carer indicated that {N} frequently experienced double vision when reading.',
        'Frequent double vision when reading was reported in relation to {N}.',
        'According to parental report, {N} often experienced text or the screen appearing double when reading.',
        'It was noted that {N} regularly experienced double vision while reading.',
      ],
    },
  },

  'vdq.6': {
    yes: {
      d: [
        '{N} reported that words often seemed to move or merge together when reading.',
        '{N} described frequently experiencing words appearing to move or merge during reading.',
        '{N} indicated that words often appeared to move or run together when reading.',
        '{N} noted that words regularly seemed to move or merge together during reading.',
        '{N} mentioned often experiencing words that appeared to move or merge when reading.',
      ],
      i: [
        'It was reported that {N} often experienced words appearing to move or merge together when reading.',
        '{N}\'s parent/carer indicated that {N} frequently experienced words appearing to move or merge during reading.',
        'Frequent movement or merging of words when reading was reported in relation to {N}.',
        'According to parental report, {N} often experienced words appearing to move or run together when reading.',
        'It was noted that {N} regularly experienced words appearing to move or merge during reading.',
      ],
    },
  },

  'vdq.7': {
    yes: {
      d: [
        '{N} reported that objects in the distance often appeared more blurred after reading.',
        '{N} described frequently experiencing blurred distance vision following periods of reading.',
        '{N} indicated that distance vision often became blurred after reading.',
        '{N} noted that distant objects often appeared blurred following reading.',
        '{N} mentioned often experiencing blurred distance vision after reading.',
      ],
      i: [
        'It was reported that {N} often found that objects in the distance appeared more blurred after reading.',
        '{N}\'s parent/carer indicated that {N} frequently experienced blurred distance vision after reading.',
        'Frequent blurring of distance vision following reading was reported in relation to {N}.',
        'According to parental report, {N} often found that distant objects appeared blurred after reading.',
        'It was noted that {N} regularly experienced blurred distance vision following reading.',
      ],
    },
  },

  'vdq.8': {
    yes: {
      d: [
        '{N} reported often having to screw up {poss} eyes to see more clearly when reading.',
        '{N} described frequently screwing up {poss} eyes in order to see more clearly during reading.',
        '{N} indicated often having to screw up {poss} eyes to read more clearly.',
        '{N} noted regularly screwing up {poss} eyes in an attempt to see more clearly when reading.',
        '{N} mentioned often having to screw up {poss} eyes for clearer vision when reading.',
      ],
      i: [
        'It was reported that {N} often had to screw up {poss} eyes to see more clearly when reading.',
        '{N}\'s parent/carer indicated that {N} frequently screwed up {poss} eyes to read more clearly.',
        'Frequent screwing up of the eyes when reading was reported in relation to {N}.',
        'According to parental report, {N} often had to screw up {poss} eyes to read more clearly.',
        'It was noted that {N} regularly screwed up {poss} eyes in an attempt to see more clearly when reading.',
      ],
    },
  },

  'vdq.9': {
    yes: {
      d: [
        '{N} reported often moving {poss} eyes around or blinking to make reading clearer or more comfortable.',
        '{N} described frequently blinking or moving {poss} eyes to aid reading comfort or clarity.',
        '{N} indicated often moving {poss} eyes or blinking to make reading clearer.',
        '{N} noted regularly blinking or moving {poss} eyes to improve reading clarity or comfort.',
        '{N} mentioned often having to blink or adjust {poss} eye movements to read more comfortably.',
      ],
      i: [
        'It was reported that {N} often moved {poss} eyes or blinked to make reading clearer or more comfortable.',
        '{N}\'s parent/carer indicated that {N} frequently blinked or moved {poss} eyes to aid reading.',
        'Frequent blinking or eye movement adjustments when reading were reported in relation to {N}.',
        'According to parental report, {N} often moved {poss} eyes or blinked to improve reading clarity.',
        'It was noted that {N} regularly blinked or adjusted {poss} eye movements when reading.',
      ],
    },
  },

  'vdq.10': {
    yes: {
      d: [
        '{N} reported experiencing other problems with {poss} vision that interfered with reading or study.',
        '{N} described having additional visual problems that affected {poss} ability to read or study.',
        '{N} indicated other vision-related difficulties that impacted on reading or study.',
        '{N} noted having other visual problems that affected {poss} reading or studying.',
        '{N} mentioned other vision problems that interfered with {poss} reading or study.',
      ],
      i: [
        'It was reported that {N} experienced other visual problems that interfered with reading or study.',
        '{N}\'s parent/carer indicated that {N} had additional visual problems affecting reading or study.',
        'Other visual problems affecting reading or study were reported in relation to {N}.',
        'According to parental report, {N} experienced additional vision-related difficulties affecting reading or study.',
        'It was noted that {N} had other visual problems that interfered with {poss} reading or study.',
      ],
    },
  },
}

// ── Multi-choice sentence bank ─────────────────────────────────────────────────
// {items} is replaced with a formatted list of selected options

const MULTI_BANK: Record<string, { d: string[]; i: string[] }> = {
  '2.4.3': {
    d: [
      '{N} reported difficulty with the following: {items}.',
      '{N} described experiencing difficulty with: {items}.',
      '{N} indicated challenges in the following areas: {items}.',
      '{N} noted difficulty with: {items}.',
      '{N} mentioned experiencing difficulty with: {items}.',
    ],
    i: [
      'Difficulty was reported for {N} in the following areas: {items}.',
      'It was reported that {N} experienced difficulty with: {items}.',
      '{N}\'s parent/carer indicated difficulty in the following areas: {items}.',
      'According to parental report, {N} experienced difficulty with: {items}.',
      'It was noted that {N} experienced difficulty with the following: {items}.',
    ],
  },
  '6.PM.1': {
    d: [
      '{N} reported difficulty with the following in daily life: {items}.',
      '{N} described challenges with: {items}.',
      '{N} indicated difficulties in the following areas: {items}.',
      '{N} noted experiencing difficulty with: {items}.',
      '{N} mentioned having difficulty with the following: {items}.',
    ],
    i: [
      'Difficulties in the following areas were reported for {N}: {items}.',
      'It was reported that {N} experienced difficulty with: {items}.',
      '{N}\'s parent/carer indicated difficulties in the following areas: {items}.',
      'According to parental report, {N} experienced difficulty with: {items}.',
      'It was noted that {N} experienced difficulty in the following areas: {items}.',
    ],
  },
  '6.LC.1': {
    d: [
      '{N} reported difficulty with the following aspects of language and communication: {items}.',
      '{N} described challenges with: {items}.',
      '{N} indicated difficulties in the following areas of language: {items}.',
      '{N} noted experiencing difficulty with: {items}.',
      '{N} mentioned having difficulty with the following aspects of communication: {items}.',
    ],
    i: [
      'Difficulties in the following areas of language and communication were reported for {N}: {items}.',
      'It was reported that {N} experienced difficulty with: {items}.',
      '{N}\'s parent/carer indicated language and communication difficulties in the following areas: {items}.',
      'According to parental report, {N} experienced difficulty with: {items}.',
      'It was noted that {N} experienced difficulty with the following aspects of language: {items}.',
    ],
  },
}

// ── Standalone free-text handlers ──────────────────────────────────────────────
// {val} is replaced with the response text

const FREE_TEXT_STANDALONE: Record<string, { d: string; i: string }> = {
  '5.0b': {
    d: 'At the time of assessment, {N} was studying or working in the following area: "{val}".',
    i: '',
  },
  '5.1': {
    d: '{N} reported having attended {val} school(s) in total.',
    i: 'It was reported that {N} had attended {val} school(s) in total.',
  },
  '6.SA.1': {
    d: 'In terms of strengths and interests, {N} identified the following: "{val}".',
    i: 'In terms of {N}\'s strengths and interests, the following was reported: "{val}".',
  },
  '6.SA.2': {
    d: '{N} also noted: "{val}".',
    i: 'The following was also noted regarding {N}\'s strengths: "{val}".',
  },
  '6.YV.1': {
    d: '{N} shared the following perspective on {poss} learning: "{val}".',
    i: '{N}\'s own perspective on {poss} learning was noted as: "{val}".',
  },
  '6.YV.2': {
    d: '{N} also noted: "{val}".',
    i: 'The following was also noted regarding {N}\'s views: "{val}".',
  },
  '6.CV.1': {
    d: '{N} shared the following about {poss} learning: "{val}".',
    i: 'Regarding {N}\'s own views on {poss} learning: "{val}".',
  },
  '6.CV.2': {
    d: '{N} also shared: "{val}".',
    i: 'The following was also noted: "{val}".',
  },
  '7.1': {
    d: '{N} also provided the following information: "{val}".',
    i: 'The following additional information was provided: "{val}".',
  },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatList(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

function pickVariant(variants: string[]): string {
  if (variants.length === 0) return ''
  return variants[Math.floor(Math.random() * variants.length)]
}

// ── Core question processor ─────────────────────────────────────────────────────

function processQuestion(
  question: Question,
  responses: Responses,
  ctx: NamingCtx,
  isTopLevel: boolean,
  sentences: string[]
): NamingCtx {
  const response = responses[question.id]

  // Skip unanswered questions and consent
  if (response === undefined || response === null || response === '') return ctx
  if (question.id === '8.1') return ctx
  if (question.note === 'SECTION_HEADER' || question.note === 'SECTION_HEADER_VDQ') return ctx

  // ── Free text ──
  if (question.type === 'free_text') {
    if (!isTopLevel) return ctx // handled by parent via freeText appending
    const handler = FREE_TEXT_STANDALONE[question.id]
    if (handler) {
      const tmpl = ctx.voice === 'direct' ? handler.d : handler.i
      if (tmpl) {
        const text = typeof response === 'string' ? response.trim() : ''
        if (text) {
          const [s, newCtx] = applyCtx(tmpl.replace(/\{val\}/g, text), ctx)
          sentences.push(s)
          return newCtx
        }
      }
    }
    return ctx
  }

  // ── Multi-choice ──
  if (question.type === 'multi_choice') {
    const selected = (Array.isArray(response) ? response : [response]) as string[]
    const meaningful = selected.filter(s => s !== 'None of the above')

    if (meaningful.length > 0) {
      const mb = MULTI_BANK[question.id]
      if (mb) {
        const variants = ctx.voice === 'direct' ? mb.d : mb.i
        const tmpl = pickVariant(variants)
        if (tmpl) {
          const [s, newCtx] = applyCtx(tmpl.replace(/\{items\}/g, formatList(meaningful)), ctx)
          sentences.push(s)
          ctx = newCtx
        }
      }
    }

    // Process follow-ups (e.g. free-text "please give details")
    if (question.followUps) {
      for (const fu of question.followUps) {
        if (conditionMatches(fu.condition, response)) {
          for (const fq of fu.questions) {
            ctx = processQuestion(fq, responses, ctx, false, sentences)
          }
        }
      }
    }
    return ctx
  }

  // ── Yes/no and single_choice ──
  const responseStr = String(response)

  // Find first free-text follow-up to append to this sentence
  let freeText: string | null = null
  if (question.followUps) {
    for (const fu of question.followUps) {
      if (conditionMatches(fu.condition, responseStr)) {
        for (const fq of fu.questions) {
          if (fq.type === 'free_text') {
            const ft = responses[fq.id]
            if (ft && typeof ft === 'string' && ft.trim()) {
              freeText = ft.trim()
            }
            break
          }
        }
        break
      }
    }
  }

  const ruleSet = BANK[question.id]
  const rule = ruleSet?.[responseStr]

  if (rule) {
    const variants = ctx.voice === 'direct' ? rule.d : rule.i
    const tmpl = pickVariant(variants)
    if (tmpl) {
      let [s, newCtx] = applyCtx(tmpl, ctx)
      ctx = newCtx
      if (freeText) {
        s = s.replace(/\.$/, '') + `, noting that "${freeText}".`
      }
      sentences.push(s)
    }
  }

  // Process non-free-text follow-ups
  if (question.followUps) {
    for (const fu of question.followUps) {
      if (conditionMatches(fu.condition, responseStr)) {
        for (const fq of fu.questions) {
          if (fq.type !== 'free_text') {
            ctx = processQuestion(fq, responses, ctx, false, sentences)
          }
        }
      }
    }
  }

  return ctx
}

function processQuestionList(
  questions: Question[],
  responses: Responses,
  name: string,
  pronouns: PronounSet,
  voice: 'direct' | 'impersonal'
): string[] {
  let ctx: NamingCtx = { name, pronouns, voice, counter: 0 }
  const sentences: string[] = []
  for (const q of questions) {
    ctx = processQuestion(q, responses, ctx, true, sentences)
  }
  return sentences
}

// ── Public API ─────────────────────────────────────────────────────────────────

export interface ProseOptions {
  name: string
  pronouns?: string
  voice: 'direct' | 'impersonal'
}

/**
 * Generates prose text from questionnaire sections and responses.
 * Returns paragraphs joined by double newlines.
 */
export function generateProse(
  sections: Section[],
  responses: Responses,
  options: ProseOptions
): string {
  const { name, pronouns, voice } = options
  const pronSet = parsePronoun(pronouns)
  const paragraphs: string[] = []

  for (const section of sections) {
    // Section-level questions (e.g. section 3 Family History, section 4 Linguistic)
    if (section.questions && section.questions.length > 0) {
      const qs = section.questions.filter(
        q => q.note !== 'SECTION_HEADER' && q.note !== 'SECTION_HEADER_VDQ'
      )
      const sents = processQuestionList(qs, responses, name, pronSet, voice)
      if (sents.length > 0) paragraphs.push(sents.join(' '))
    }

    // Subsections
    if (section.subsections) {
      for (const sub of section.subsections) {
        const qs = sub.questions.filter(
          q => q.note !== 'SECTION_HEADER' && q.note !== 'SECTION_HEADER_VDQ'
        )
        const sents = processQuestionList(qs, responses, name, pronSet, voice)
        if (sents.length > 0) paragraphs.push(sents.join(' '))
      }
    }
  }

  return paragraphs.join('\n\n')
}

// ── Key Points bank ───────────────────────────────────────────────────────────
// Hand-written clinical note outputs for every yes/no and choice question.
// topic   → used for "No information provided regarding [topic]."
// yes/no  → standalone clinical statement for that answer
// not_sure / prefer_not_to_say → override defaults (otherwise "[Topic] — uncertain." etc.)
// single_prefix → for single_choice: "[prefix]: [selected option]."
// multi_prefix  → for multi_choice when items selected: "[prefix]: [items lowercased]."
// multi_none    → output when "None of the above" is selected

export interface KPEntry {
  topic: string
  yes?: string
  no?: string
  not_sure?: string
  prefer_not_to_say?: string
  single_prefix?: string
  multi_prefix?: string
  multi_none?: string
  free_text_prefix?: string
}

const KEY_POINTS_BANK: Record<string, KPEntry> = {

  // ── 2.1 Speech, Language and Communication ──────────────────────────────────

  '2.1.1': {
    topic: 'early speech and language development',
    yes: 'Concerns about early speech and language development reported.',
    no:  'No concerns about early speech and language development.',
  },
  '2.1.1b': {
    topic: 'receipt of speech and language therapy',
    yes: 'Speech and language therapy or support was received.',
    no:  'No speech and language therapy or support was received.',
  },
  '2.1.2': {
    topic: 'current speech, language or communication',
    yes: 'Current concerns about speech, language or communication reported.',
    no:  'No current concerns about speech, language or communication.',
  },
  '2.1.3': {
    topic: 'social interaction or communication with others',
    yes: 'Concerns about social interaction or communication with others reported.',
    no:  'No concerns about social interaction or communication with others.',
  },
  '2.1.3b': {
    topic: 'professional involvement for social communication difficulties',
    yes: 'Seen by a professional regarding social interaction or communication difficulties.',
    no:  'Not seen by any professional regarding social interaction or communication difficulties.',
  },

  // ── 2.2 Motor Coordination ──────────────────────────────────────────────────

  '2.2.1': {
    topic: 'physical development and gross motor coordination',
    yes: 'Concerns about physical development or gross motor coordination reported (e.g. walking, balance, general coordination).',
    no:  'No concerns about physical development or gross motor coordination.',
  },
  '2.2.2': {
    topic: 'fine motor skills',
    yes: 'Concerns about fine motor skills reported (e.g. handwriting, pencil grip, using scissors).',
    no:  'No concerns about fine motor skills.',
  },
  '2.2.3': {
    topic: 'formal assessment or diagnosis of a coordination difficulty',
    yes: 'Assessed for or diagnosed with a coordination difficulty (e.g. DCD/dyspraxia).',
    no:  'No formal assessment or diagnosis of a coordination difficulty.',
  },

  // ── 2.4 Hearing ─────────────────────────────────────────────────────────────

  '2.4.1': {
    topic: 'hearing test history',
    yes: 'Hearing test carried out previously.',
    no:  'No history of a hearing test.',
  },
  '2.4.1a': {
    topic: 'hearing test outcome',
    single_prefix: 'Hearing test outcome',
  },
  '2.4.2': {
    topic: 'history of ear infections or glue ear',
    yes: 'History of repeated ear infections or glue ear reported.',
    no:  'No history of repeated ear infections or glue ear.',
  },
  '2.4.3': {
    topic: 'auditory processing or listening difficulties',
    multi_prefix: 'Reported listening or auditory difficulties',
    multi_none:   'No auditory processing or listening difficulties reported.',
  },

  // ── 2.5 Attention and Concentration ─────────────────────────────────────────

  '2.5.1': {
    topic: 'attention and concentration',
    yes: 'Concerns about attention and concentration reported.',
    no:  'No concerns about attention or concentration.',
  },
  '2.5.1b': {
    topic: 'professional involvement for attention and concentration difficulties',
    yes: 'Seen by a professional regarding attention and concentration difficulties.',
    no:  'Not seen by any professional regarding attention and concentration difficulties.',
  },

  // ── 2.6 Other Diagnoses or Referrals ────────────────────────────────────────

  '2.6.1': {
    topic: 'other diagnoses relevant to learning or development',
    yes: 'One or more additional diagnoses relevant to learning or development reported.',
    no:  'No other diagnoses relevant to learning or development.',
  },
  '2.6.1d': {
    topic: 'availability of diagnostic report or letter',
    yes: 'Copy of diagnostic report or letter available.',
    no:  'No copy of diagnostic report or letter available.',
  },
  '2.6.2': {
    topic: 'current referral or assessment in progress',
    yes: 'Currently waiting for a referral or assessment.',
    no:  'Not currently waiting for any referral or assessment.',
  },

  // ── 2.7 Sensitive Information ────────────────────────────────────────────────

  '2.7.1': {
    topic: 'complications during pregnancy, birth, or the neonatal period',
    yes: 'Complications during pregnancy, birth, or the neonatal period reported.',
    no:  'No complications during pregnancy, birth, or the neonatal period reported.',
    prefer_not_to_say: 'Pregnancy, birth, and neonatal history - preferred not to say.',
  },
  '2.7.2': {
    topic: 'ongoing medical conditions or regular medication',
    yes: 'Ongoing medical conditions or regular medication reported.',
    no:  'No ongoing medical conditions or regular medication.',
  },
  '2.7.3': {
    topic: 'mental health difficulties',
    yes: 'Difficulties with mental health reported (e.g. anxiety, low mood).',
    no:  'No mental health difficulties reported.',
    prefer_not_to_say: 'Mental health history - preferred not to say.',
  },
  '2.7.3b': {
    topic: 'support received for mental health difficulties',
    yes: 'Support for mental health difficulties received (e.g. CAMHS, counselling, medication).',
    no:  'No support for mental health difficulties received.',
  },
  '2.7.4': {
    topic: 'significant life events or adverse experiences affecting learning',
    yes: 'Significant life events or adverse experiences affecting learning or development reported.',
    no:  'No significant life events or adverse experiences affecting learning or development reported.',
    not_sure: 'Significant life events or adverse experiences - uncertain.',
    prefer_not_to_say: 'Significant life events or adverse experiences - preferred not to say.',
  },

  // ── 3. Family History ────────────────────────────────────────────────────────

  '3.1': {
    topic: 'family history of reading, writing or spelling difficulties',
    yes: 'Family history of reading, writing or spelling difficulties reported.',
    no:  'No family history of reading, writing or spelling difficulties.',
    not_sure: 'Family history of reading, writing or spelling difficulties - uncertain.',
  },
  '3.2': {
    topic: 'family history of difficulties with mathematics or numbers',
    yes: 'Family history of difficulties with mathematics or numbers reported.',
    no:  'No family history of difficulties with mathematics or numbers.',
    not_sure: 'Family history of mathematics difficulties - uncertain.',
  },
  '3.3': {
    topic: 'family history of a specific learning difficulty or developmental condition',
    yes: 'Family member(s) with a diagnosis of a specific learning difficulty or developmental condition reported.',
    no:  'No family history of a specific learning difficulty or developmental condition.',
    not_sure: 'Family history of SpLD or developmental diagnosis - uncertain.',
  },

  // ── 4. Linguistic History ────────────────────────────────────────────────────

  '4.1': {
    topic: 'English as first and only language',
    yes: 'English is reported as the first and only language.',
    no:  'English is not the first and only language; multilingual or EAL background.',
  },
  '4.1f': {
    topic: 'literacy or numeracy difficulties in the first language',
    yes: 'Difficulties with reading, writing, spelling or maths reported in the first language.',
    no:  'No difficulties with reading, writing, spelling or maths in the first language.',
    not_sure: 'Literacy or numeracy difficulties in first language - uncertain.',
  },

  // ── 5. Educational History (shared IDs) ─────────────────────────────────────

  '5.0': {
    topic: 'current situation (education or employment)',
    single_prefix: 'Current situation',
  },
  '5.0b': {
    topic: 'current studies or job role',
    free_text_prefix: 'Current studies or role',
  },
  '5.1': {
    topic: 'number of schools attended',
    free_text_prefix: 'Schools attended',
  },
  '5.2': {
    topic: 'consistency of school attendance',
    yes: 'School attendance has generally been consistent.',
    no:  'School attendance has not been consistent.',
  },
  '5.3': {
    topic: 'impact of the Covid-19 pandemic on education',
    yes: 'Education was significantly affected by the Covid-19 pandemic.',
    no:  'Education was not significantly affected by the Covid-19 pandemic.',
  },
  // 5.4 is GCSE results in 16plus, phonics check in under-16 — handled separately below
  '5.4': {
    topic: 'knowledge of formal qualification results',
    yes: 'Formal qualification results are known and available.',
    no:  'Formal qualification results are not known or not available.',
    single_prefix: 'Phonics screening check (Year 1/2)',
  },
  '5.4a': {
    topic: 'qualification results detail',
    free_text_prefix: 'Qualification results',
  },
  '5.5': {
    topic: 'knowledge of end-of-phase assessment results',
    yes: 'End-of-phase assessment results (e.g. SATs) are known.',
    no:  'End-of-phase assessment results not known.',
  },
  '5.LS.1': {
    topic: 'additional learning support at school or college',
    yes: 'Additional learning support at school or college received.',
    no:  'No additional learning support at school or college received.',
  },
  '5.LS.1b': {
    topic: 'effectiveness of learning support received',
    single_prefix: 'Learning support effectiveness',
  },
  '5.LS.1c': {
    topic: 'whether learning support is still in place',
    yes: 'Additional learning support is still currently in place.',
    no:  'Additional learning support is no longer in place.',
  },
  '5.LS.2': {
    topic: 'special educational needs status',
    single_prefix: 'SEN status',
  },
  '5.LS.3': {
    topic: 'additional support received outside school or college',
    yes: 'Additional support received outside school or college (e.g. private tutoring, specialist tuition).',
    no:  'No additional support received outside school or college.',
  },
  '5.PA.1': {
    topic: 'previous assessment related to learning',
    yes: 'Previous assessment(s) related to learning reported.',
    no:  'No previous assessments related to learning.',
  },
  '5.PA.1e': {
    topic: 'availability of previous assessment report',
    yes: 'Copy of previous assessment report available.',
    no:  'No copy of previous assessment report available.',
  },
  '5.PA.2': {
    topic: 'current exam access arrangements',
    yes: 'Exam access arrangements currently in place.',
    no:  'No current exam access arrangements.',
  },
  '5.AL.1': {
    topic: 'anxiety or distress related to learning activities',
    yes: 'Anxiety or distress related to specific subjects or learning activities reported.',
    no:  'No anxiety or distress related to specific subjects or learning activities reported.',
  },

  // ── 6. Current Situation ─────────────────────────────────────────────────────

  '6.LIT.1': {
    topic: 'reading concerns',
    yes: 'Concerns about reading reported.',
    no:  'No concerns about reading reported.',
  },
  '6.LIT.2': {
    topic: 'writing or spelling concerns',
    yes: 'Concerns about writing or spelling reported.',
    no:  'No concerns about writing or spelling reported.',
  },
  '6.LIT.3': {
    topic: 'targeted help for reading, writing or spelling',
    yes: 'Targeted help specifically for reading, writing or spelling received.',
    no:  'No targeted help specifically for reading, writing or spelling received.',
  },
  '6.LIT.4': {
    topic: 'difficulty with tasks requiring simultaneous reading, writing or listening',
    yes: 'Difficulty reported with tasks requiring simultaneous reading, writing or listening (e.g. note-taking, copying from the board).',
    no:  'No difficulty reported with tasks requiring simultaneous reading, writing or listening.',
  },
  '6.MA.1': {
    topic: 'maths or arithmetic concerns',
    yes: 'Concerns about maths or arithmetic skills reported.',
    no:  'No concerns about maths or arithmetic skills reported.',
  },
  '6.PM.1': {
    topic: 'planning, memory, attention or organisation difficulties',
    multi_prefix: 'Reported difficulties with',
    multi_none:   'No difficulties with planning, memory, attention or organisation reported.',
  },
  '6.LC.1': {
    topic: 'language or communication difficulties',
    multi_prefix: 'Reported current language or communication difficulties',
    multi_none:   'No current language or communication difficulties reported.',
  },
  '6.PS.1': {
    topic: 'previous screening questionnaires or rating scales for learning difficulties',
    yes: 'Previous screening questionnaire or rating scale for learning difficulties completed prior to this assessment.',
    no:  'No previous screening questionnaires or rating scales for learning difficulties completed.',
  },
  '6.SA.1': {
    topic: 'strengths and interests',
    free_text_prefix: 'Strengths and interests',
  },
  '6.SA.2': {
    topic: 'notable achievements',
    free_text_prefix: 'Notable achievements',
  },
  '6.YV.1': {
    topic: 'own account of main difficulties',
    free_text_prefix: 'Own account of main difficulties',
  },
  '6.YV.2': {
    topic: 'own view on how they learn best',
    free_text_prefix: 'How they learn best (own view)',
  },
  '6.CV.1': {
    topic: 'own account of current challenges',
    free_text_prefix: 'Own account of current challenges',
  },
  '6.CV.2': {
    topic: 'own view on how they learn best',
    free_text_prefix: 'How they learn best (own view)',
  },
  '7.1': {
    topic: 'any other information',
    free_text_prefix: 'Other information',
  },

  // ── Visual History ───────────────────────────────────────────────────────────

  'vh.1': {
    topic: 'optical prescription (glasses or contact lenses)',
    yes: 'Optical prescription lenses (glasses or contact lenses) have been prescribed.',
    no:  'No optical prescription lenses prescribed.',
  },
  'vh.1a': {
    topic: 'type of prescription required',
    single_prefix: 'Prescription required for',
  },
  'vh.1b': {
    topic: 'whether glasses or contact lenses are worn as advised',
    yes: 'Glasses or contact lenses are worn as advised.',
    no:  'Glasses or contact lenses are not worn as advised.',
  },
  'vh.1c': {
    topic: 'whether glasses or contact lenses are present at assessment',
    yes: 'Glasses or contact lenses are present at the assessment.',
    no:  'Glasses or contact lenses are not present at the assessment.',
  },
  'vh.2': {
    topic: 'date of last sight test or eye test',
    single_prefix: 'Last sight test or eye test',
  },
  'vh.3': {
    topic: 'previous use of coloured overlays or precision-tinted lenses',
    yes: 'Previous use of coloured overlays or precision-tinted lenses reported.',
    no:  'No previous use of coloured overlays or precision-tinted lenses.',
  },
  'vh.3c': {
    topic: 'whether coloured overlays or tinted lenses helped',
    yes: 'Coloured overlays or precision-tinted lenses reported as helpful.',
    no:  'Coloured overlays or precision-tinted lenses did not help.',
  },
  'vh.3d': {
    topic: 'current use of coloured overlays or precision-tinted lenses',
    yes: 'Coloured overlays or precision-tinted lenses are still in use.',
    no:  'Coloured overlays or precision-tinted lenses are no longer in use.',
  },
  'vh.4': {
    topic: 'hospital treatment for a problem with eyes or vision',
    yes: 'History of hospital treatment for an eye or vision problem reported (e.g. amblyopia, squint).',
    no:  'No history of hospital treatment for an eye or vision problem.',
  },

  // ── Visual Difficulties Questionnaire (VDQ) ──────────────────────────────────

  'vdq.1': {
    topic: 'headaches when reading or studying',
    yes: 'Frequent headaches when reading or studying reported.',
    no:  'No frequent headaches when reading or studying.',
  },
  'vdq.2': {
    topic: 'eyes feeling sore, gritty or watery',
    yes: 'Eyes often feel sore, gritty or watery.',
    no:  'No reports of eyes feeling sore, gritty or watery.',
  },
  'vdq.3': {
    topic: 'discomfort reading from white paper or bright screen',
    yes: 'Reading from white paper or a bright screen often feels uncomfortable.',
    no:  'No discomfort reported when reading from white paper or a bright screen.',
  },
  'vdq.4': {
    topic: 'print appearing blurred or going in and out of focus when reading',
    yes: 'Print often appears blurred or goes in and out of focus when reading.',
    no:  'No reports of print appearing blurred or losing focus when reading.',
  },
  'vdq.5': {
    topic: 'print or screen appearing double when reading',
    yes: 'Print, book or screen often appears double when reading.',
    no:  'No reports of double vision when reading.',
  },
  'vdq.6': {
    topic: 'words appearing to move or merge together when reading',
    yes: 'Words often seem to move or merge together when reading.',
    no:  'No reports of words moving or merging together when reading.',
  },
  'vdq.7': {
    topic: 'distance vision becoming more blurred after reading',
    yes: 'Objects in the distance often appear more blurred after reading.',
    no:  'No reports of distance vision becoming more blurred after reading.',
  },
  'vdq.8': {
    topic: 'screwing up eyes to see more clearly when reading',
    yes: 'Often has to screw up eyes to see more clearly when reading.',
    no:  'No reports of screwing up eyes to see more clearly when reading.',
  },
  'vdq.9': {
    topic: 'moving eyes or blinking to make text clearer when reading',
    yes: 'Often moves eyes around or blinks to make text clearer or more comfortable when reading.',
    no:  'No reports of needing to move eyes or blink excessively when reading.',
  },
  'vdq.10': {
    topic: 'other vision problems interfering with reading or studying',
    yes: 'Other vision problems that interfere with reading or studying reported.',
    no:  'No other vision problems reported that interfere with reading or studying.',
  },
}

/**
 * Generates standalone clinical key-point notes from questionnaire responses.
 * Every yes/no question is included. Free text is quoted verbatim.
 * Unanswered top-level questions appear as "No information provided regarding [topic]."
 * Follow-up questions only appear when their trigger condition was met.
 * Untriggered follow-ups are silently skipped.
 */
export function generateKeyPoints(
  sections: Section[],
  responses: Responses,
  dynamicBank?: Record<string, KPEntry>
): string {

  function processQ(q: Question): string[] {
    if (q.note === 'SECTION_HEADER' || q.note === 'SECTION_HEADER_VDQ') return []
    if (q.id === '8.1') return [] // skip consent checkbox

    const val = responses[q.id]
    const isEmpty = val === undefined || val === null || val === '' ||
      (Array.isArray(val) && val.length === 0)

    const entry = (dynamicBank?.[q.id]) ?? KEY_POINTS_BANK[q.id]
    const result: string[] = []

    if (q.type === 'free_text') {
      if (!isEmpty) {
        if (entry?.free_text_prefix) result.push(`${entry.free_text_prefix}: "${String(val)}".`)
        else result.push(`"${String(val)}"`)
      }

    } else if (isEmpty) {
      // Unanswered questions are silently skipped

    } else if (q.type === 'multi_choice') {
      const arr = (Array.isArray(val) ? val : [String(val)]) as string[]
      // Filter out "None of the above" variants
      const selected = arr.filter(v => !/^none/i.test(v))
      if (selected.length === 0) {
        // Explicit "none" selection
        if (entry?.multi_none) result.push(entry.multi_none)
        else if (entry) result.push(`No ${entry.topic} reported.`)
      } else {
        const joined = selected.map(v => v.toLowerCase()).join('; ')
        if (entry?.multi_prefix) result.push(`${entry.multi_prefix}: ${joined}.`)
        else result.push(`${joined}.`)
      }

    } else if (q.type === 'single_choice') {
      if (entry?.single_prefix) result.push(`${entry.single_prefix}: ${String(val)}.`)
      else result.push(`${String(val)}.`)

    } else {
      // yes_no and variants
      const v = String(val)
      const topicCap = entry ? entry.topic.charAt(0).toUpperCase() + entry.topic.slice(1) : ''
      if (v === 'yes')
        result.push(entry?.yes ?? `${topicCap}.`)
      else if (v === 'no')
        result.push(entry?.no ?? `No ${entry?.topic ?? ''}.`)
      else if (v === 'not_sure')
        result.push(entry?.not_sure ?? `${topicCap} - uncertain.`)
      else if (v === 'prefer_not_to_say')
        result.push(entry?.prefer_not_to_say ?? `${topicCap} - preferred not to say.`)
    }

    // Follow-ups — only when their trigger condition was met
    if (!isEmpty && q.followUps) {
      for (const fu of q.followUps) {
        if (conditionMatches(fu.condition, val as string | string[] | boolean)) {
          for (const fq of fu.questions) result.push(...processQ(fq))
        }
      }
    }

    return result
  }

  const output: string[] = []

  for (const section of sections) {
    const sectionLines: string[] = []
    section.questions?.forEach(q => sectionLines.push(...processQ(q)))
    section.subsections?.forEach(sub => sub.questions.forEach(q => sectionLines.push(...processQ(q))))
    if (sectionLines.length > 0) {
      output.push(...sectionLines)
      output.push('') // blank line between sections
    }
  }

  return output.join('\n').trimEnd()
}

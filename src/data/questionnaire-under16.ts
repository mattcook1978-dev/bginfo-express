import type { Questionnaire } from '../types'

export const questionnaireUnder16: Questionnaire = {
  type: 'under16',
  sections: [
    {
      id: '2',
      title: 'Health and Developmental History',
      reportSectionId: 'bg-health',
      subsections: [
        {
          id: '2.1',
          title: 'Speech, Language and Communication',
          questions: [
            {
              id: '2.1.1',
              text: 'Were there any concerns about your child\'s speech or language development in their early years?',
              type: 'yes_no',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '2.1.1a',
                      text: 'Please briefly describe the concerns (e.g. late to start talking, difficulty being understood, speech therapy)',
                      type: 'free_text',
                    },
                    {
                      id: '2.1.1b',
                      text: 'Did your child receive speech and language therapy or support?',
                      type: 'yes_no',
                      followUps: [
                        {
                          condition: 'yes',
                          questions: [
                            {
                              id: '2.1.1c',
                              text: 'Please give brief details (e.g. when, for how long, what type of support)',
                              type: 'free_text',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              id: '2.1.2',
              text: 'Do you have any current concerns about your child\'s speech, language or communication?',
              type: 'yes_no',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '2.1.2a',
                      text: 'Please briefly describe your current concerns',
                      type: 'free_text',
                    },
                  ],
                },
              ],
            },
            {
              id: '2.1.3',
              text: 'Have there been any concerns about your child\'s social interaction or communication with others?',
              type: 'yes_no',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '2.1.3a',
                      text: 'Please briefly describe these concerns',
                      type: 'free_text',
                    },
                    {
                      id: '2.1.3b',
                      text: 'Has your child been seen by any professional about these difficulties (e.g. paediatrician, educational psychologist)?',
                      type: 'yes_no',
                      followUps: [
                        {
                          condition: 'yes',
                          questions: [
                            {
                              id: '2.1.3c',
                              text: 'Please give brief details (who, when, and outcome if known)',
                              type: 'free_text',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: '2.2',
          title: 'Motor Coordination',
          questions: [
            {
              id: '2.2.1',
              text: 'Were there any concerns about your child\'s physical development, such as learning to walk, balance, or general coordination?',
              type: 'yes_no',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '2.2.1a',
                      text: 'Please briefly describe',
                      type: 'free_text',
                    },
                  ],
                },
              ],
            },
            {
              id: '2.2.2',
              text: 'Were or are there any concerns about your child\'s fine motor skills, such as holding a pencil, using scissors, doing up buttons, or handwriting?',
              type: 'yes_no',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '2.2.2a',
                      text: 'Please briefly describe',
                      type: 'free_text',
                    },
                  ],
                },
              ],
            },
            {
              id: '2.2.3',
              text: 'Has your child ever been assessed for or diagnosed with a coordination difficulty (e.g. Developmental Coordination Disorder / dyspraxia)?',
              type: 'yes_no',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '2.2.3a',
                      text: 'Please give brief details (who diagnosed, when)',
                      type: 'free_text',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: '2.4',
          title: 'Hearing',
          questions: [
            {
              id: '2.4.1',
              text: 'Has your child ever had a hearing test?',
              type: 'yes_no',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '2.4.1a',
                      text: 'What was the outcome?',
                      type: 'single_choice',
                      options: ['No concerns identified', 'A hearing difficulty was identified', 'Unsure / can\'t remember'],
                      followUps: [
                        {
                          condition: 'A hearing difficulty was identified',
                          questions: [
                            {
                              id: '2.4.1b',
                              text: 'Please describe any hearing difficulty identified',
                              type: 'free_text',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              id: '2.4.2',
              text: 'Has your child had repeated ear infections or glue ear?',
              type: 'yes_no',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '2.4.2a',
                      text: 'Please briefly describe (e.g. how often, whether grommets were fitted)',
                      type: 'free_text',
                    },
                  ],
                },
              ],
            },
            {
              id: '2.4.3',
              text: 'Does your child seem to have difficulty with any of the following?',
              type: 'multi_choice',
              options: [
                'Following conversations in noisy places (e.g. classroom, restaurant)',
                'Telling where a sound is coming from',
                'Following spoken instructions, especially when there are several steps',
                'Hearing the difference between similar-sounding words',
                'None of the above',
              ],
              followUps: [
                {
                  condition: ['Following conversations in noisy places (e.g. classroom, restaurant)', 'Telling where a sound is coming from', 'Following spoken instructions, especially when there are several steps', 'Hearing the difference between similar-sounding words'],
                  questions: [
                    {
                      id: '2.4.3a',
                      text: 'Please give any further details',
                      type: 'free_text',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: '2.5',
          title: 'Attention and Concentration',
          questions: [
            {
              id: '2.5.1',
              text: 'Do you have any concerns about your child\'s ability to pay attention or concentrate?',
              type: 'yes_no',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '2.5.1a',
                      text: 'Please describe the kinds of difficulties you have noticed (e.g. easily distracted, difficulty staying on task, fidgety, acts without thinking)',
                      type: 'free_text',
                    },
                    {
                      id: '2.5.1b',
                      text: 'Has your child been seen by any professional about these difficulties?',
                      type: 'yes_no',
                      followUps: [
                        {
                          condition: 'yes',
                          questions: [
                            {
                              id: '2.5.1c',
                              text: 'Please give brief details (who, when, and outcome if known)',
                              type: 'free_text',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: '2.6',
          title: 'Other Diagnoses or Referrals',
          questions: [
            {
              id: '2.6.1',
              text: 'Has your child received any other diagnoses relevant to their learning or development (e.g. ASD/ASC, ADHD, a specific learning difficulty)?',
              type: 'yes_no',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '2.6.1a',
                      text: 'What was the diagnosis?',
                      type: 'free_text',
                    },
                    {
                      id: '2.6.1b',
                      text: 'When was it made (approximate date)?',
                      type: 'free_text',
                    },
                    {
                      id: '2.6.1c',
                      text: 'Who made the diagnosis (e.g. paediatrician, educational psychologist)?',
                      type: 'free_text',
                    },
                    {
                      id: '2.6.1d',
                      text: 'Do you have a copy of the report or letter?',
                      type: 'yes_no',
                    },
                  ],
                },
              ],
            },
            {
              id: '2.6.2',
              text: 'Is your child currently waiting for any referral or assessment (e.g. for ASD/ASC, ADHD, speech and language)?',
              type: 'yes_no',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '2.6.2a',
                      text: 'Please give brief details',
                      type: 'free_text',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: '2.7',
          title: 'Sensitive Information',
          note: 'The following questions ask about topics that some people find sensitive. You only need to share information you are comfortable sharing. You can discuss any of these in person if you would prefer not to write them down.',
          questions: [
            {
              id: '2.7.1',
              text: 'Were there any complications during pregnancy, birth, or the period shortly after birth (e.g. prematurity, low birth weight, time in neonatal care)?',
              type: 'yes_no_prefernot',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '2.7.1a',
                      text: 'Please briefly describe',
                      type: 'free_text',
                    },
                  ],
                },
              ],
            },
            {
              id: '2.7.2',
              text: 'Does your child have any ongoing medical conditions or take any regular medication?',
              type: 'yes_no',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '2.7.2a',
                      text: 'Please briefly describe',
                      type: 'free_text',
                    },
                  ],
                },
              ],
            },
            {
              id: '2.7.3',
              text: 'Has your child experienced any difficulties with their mental health (e.g. anxiety, low mood)?',
              type: 'yes_no_prefernot',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '2.7.3a',
                      text: 'Please briefly describe',
                      type: 'free_text',
                    },
                    {
                      id: '2.7.3b',
                      text: 'Has your child received any support for this (e.g. CAMHS, counselling, medication)?',
                      type: 'yes_no',
                      followUps: [
                        {
                          condition: 'yes',
                          questions: [
                            {
                              id: '2.7.3c',
                              text: 'Please briefly describe',
                              type: 'free_text',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              id: '2.7.4',
              text: 'Has your child experienced any significant life events or adverse experiences that may have affected their learning or development?',
              type: 'yes_no_prefernot',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '2.7.4a',
                      text: 'Please briefly describe (only share what you are comfortable sharing)',
                      type: 'free_text',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: '3',
      title: 'Family History',
      reportSectionId: 'bg-family',
      questions: [
        {
          id: '3.1',
          text: 'Is there a history of reading, writing or spelling difficulties in the close family (parents, siblings, grandparents)?',
          type: 'yes_no_notsure',
          note: 'Research shows that specific learning difficulties often run in families. You do not need to name specific family members.',
          followUps: [
            {
              condition: 'yes',
              questions: [
                {
                  id: '3.1a',
                  text: 'Please briefly describe (e.g. \'a parent had difficulty with reading at school\')',
                  type: 'free_text',
                },
              ],
            },
          ],
        },
        {
          id: '3.2',
          text: 'Is there a history of difficulties with mathematics or numbers in the close family?',
          type: 'yes_no_notsure',
          followUps: [
            {
              condition: 'yes',
              questions: [
                {
                  id: '3.2a',
                  text: 'Please briefly describe',
                  type: 'free_text',
                },
              ],
            },
          ],
        },
        {
          id: '3.3',
          text: 'Has anyone in the close family been diagnosed with a specific learning difficulty (e.g. dyslexia, dyscalculia, dyspraxia) or other developmental condition (e.g. ADHD, ASD/ASC)?',
          type: 'yes_no_notsure',
          followUps: [
            {
              condition: 'yes',
              questions: [
                {
                  id: '3.3a',
                  text: 'Please briefly describe (e.g. \'a sibling has been diagnosed with dyslexia\')',
                  type: 'free_text',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: '4',
      title: 'Linguistic History',
      reportSectionId: 'bg-linguistic',
      questions: [
        {
          id: '4.1',
          text: 'Is English your child\'s first and only language?',
          type: 'yes_no',
          followUps: [
            {
              condition: 'no',
              questions: [
                {
                  id: '4.1a',
                  text: 'What language(s) were spoken in your home during your child\'s early years?',
                  type: 'free_text',
                },
                {
                  id: '4.1b',
                  text: 'What language(s) are currently spoken at home?',
                  type: 'free_text',
                },
                {
                  id: '4.1c',
                  text: 'What language does your child consider to be their strongest or main language?',
                  type: 'free_text',
                },
                {
                  id: '4.1d',
                  text: 'In what language has your child been mainly educated?',
                  type: 'free_text',
                },
                {
                  id: '4.1e',
                  text: 'How long has your child been living in the UK or an English-speaking country?',
                  type: 'free_text',
                },
                {
                  id: '4.1f',
                  text: 'Has your child experienced any difficulties with reading, writing, spelling or maths in their first language?',
                  type: 'yes_no_notsure',
                  followUps: [
                    {
                      condition: 'yes',
                      questions: [
                        {
                          id: '4.1g',
                          text: 'Please briefly describe',
                          type: 'free_text',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: '5',
      title: 'Educational History',
      reportSectionId: 'bg-educational',
      questions: [
        {
          id: '5.1',
          text: 'How many schools has your child attended (including current school)?',
          type: 'free_text',
        },
        {
          id: '5.2',
          text: 'Has your child\'s school attendance generally been consistent?',
          type: 'yes_no',
          followUps: [
            {
              condition: 'no',
              questions: [
                {
                  id: '5.2a',
                  text: 'Please briefly describe the reasons for disrupted attendance (e.g. illness, school moves, school refusal)',
                  type: 'free_text',
                },
              ],
            },
          ],
        },
        {
          id: '5.3',
          text: 'Was your child\'s education significantly affected by the Covid-19 pandemic?',
          type: 'yes_no',
          followUps: [
            {
              condition: 'yes',
              questions: [
                {
                  id: '5.3a',
                  text: 'Please briefly describe how (e.g. missed learning, difficulty with remote schooling, emotional impact)',
                  type: 'free_text',
                },
              ],
            },
          ],
        },
        {
          id: '5.4',
          text: 'Do you know the results of your child\'s Year 1 or Year 2 phonics screening check?',
          type: 'single_choice',
          options: ['Yes - they passed', 'Yes - they did not pass', 'Not sure / don\'t know'],
        },
        {
          id: '5.5',
          text: 'Do you know the results of any end-of-year or end-of-phase assessments (e.g. SATs, teacher assessments)?',
          type: 'yes_no',
          followUps: [
            {
              condition: 'yes',
              questions: [
                {
                  id: '5.5a',
                  text: 'Please share any results you have',
                  type: 'free_text',
                },
              ],
            },
          ],
        },
      ],
      subsections: [
        {
          id: '5.LS',
          title: 'Learning Support',
          questions: [
            {
              id: '5.LS.1',
              text: 'Has your child ever received additional learning support at school (e.g. small group work, one-to-one support, intervention programmes)?',
              type: 'yes_no',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '5.LS.1a',
                      text: 'What type of support was provided?',
                      type: 'free_text',
                    },
                    {
                      id: '5.LS.1b',
                      text: 'Did the support seem to help?',
                      type: 'single_choice',
                      options: ['Yes, it helped a lot', 'It helped a little', 'It did not seem to help', 'Not sure'],
                    },
                    {
                      id: '5.LS.1c',
                      text: 'Is this support still in place?',
                      type: 'yes_no',
                    },
                  ],
                },
              ],
            },
            {
              id: '5.LS.2',
              text: 'Does your child have any special educational needs status (e.g. SEN Support, EHCP, or equivalent)?',
              type: 'single_choice',
              options: ['Yes - SEN Support', 'Yes - EHCP (or Statement)', 'No', 'Not sure'],
            },
            {
              id: '5.LS.3',
              text: 'Has your child received any additional support outside of school (e.g. private tutoring, specialist tuition)?',
              type: 'yes_no',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '5.LS.3a',
                      text: 'Please briefly describe',
                      type: 'free_text',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: '5.PA',
          title: 'Previous Assessments',
          questions: [
            {
              id: '5.PA.1',
              text: 'Has your child had any previous assessments related to their learning (e.g. educational psychology, dyslexia screening, cognitive assessment)?',
              type: 'yes_no',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '5.PA.1a',
                      text: 'What type of assessment was it?',
                      type: 'free_text',
                    },
                    {
                      id: '5.PA.1b',
                      text: 'When did it take place (approximate date)?',
                      type: 'free_text',
                    },
                    {
                      id: '5.PA.1c',
                      text: 'Who carried it out?',
                      type: 'free_text',
                    },
                    {
                      id: '5.PA.1d',
                      text: 'What was the outcome?',
                      type: 'free_text',
                    },
                    {
                      id: '5.PA.1e',
                      text: 'Do you have a copy of the report?',
                      type: 'yes_no',
                    },
                  ],
                },
              ],
            },
            {
              id: '5.PA.2',
              text: 'Does your child currently have any exam access arrangements in place (e.g. extra time, a reader, a scribe)?',
              type: 'yes_no',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '5.PA.2a',
                      text: 'Please describe what arrangements are in place',
                      type: 'free_text',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: '5.AL',
          title: 'Anxiety Related to Learning',
          questions: [
            {
              id: '5.AL.1',
              text: 'Does your child experience anxiety or distress related to any particular school subject or activity (e.g. reading aloud, writing, maths, tests, speaking in front of the class)?',
              type: 'yes_no',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '5.AL.1a',
                      text: 'Which subjects or activities cause anxiety?',
                      type: 'free_text',
                    },
                    {
                      id: '5.AL.1b',
                      text: 'How does this affect your child (e.g. avoidance, upset, physical symptoms)?',
                      type: 'free_text',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: '6',
      title: 'Current Situation',
      reportSectionId: 'bg-current',
      subsections: [
        {
          id: '6.LIT',
          title: 'Literacy',
          questions: [
            {
              id: '6.LIT.1',
              text: 'Do you have concerns about your child\'s reading?',
              type: 'yes_no',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '6.LIT.1a',
                      text: 'Please describe your concerns (e.g. reads slowly, makes errors, struggles with understanding what they have read)',
                      type: 'free_text',
                    },
                  ],
                },
              ],
            },
            {
              id: '6.LIT.2',
              text: 'Do you have concerns about your child\'s writing or spelling?',
              type: 'yes_no',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '6.LIT.2a',
                      text: 'Please describe your concerns',
                      type: 'free_text',
                    },
                  ],
                },
              ],
            },
            {
              id: '6.LIT.3',
              text: 'Has your child received any targeted help specifically for reading, writing or spelling?',
              type: 'yes_no',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '6.LIT.3a',
                      text: 'What help was provided and did it make a difference?',
                      type: 'free_text',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: '6.MA',
          title: 'Maths and Arithmetic',
          questions: [
            {
              id: '6.MA.1',
              text: 'Do you have concerns about your child\'s maths or arithmetic skills?',
              type: 'yes_no',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '6.MA.1a',
                      text: 'Please describe your concerns',
                      type: 'free_text',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: '6.PM',
          title: 'Planning, Memory, Attention and Organisation',
          questions: [
            {
              id: '6.PM.1',
              text: 'Does your child have difficulty with any of the following in daily life or at school?',
              type: 'multi_choice',
              options: [
                'Remembering instructions or information',
                'Organising their belongings, homework or school bag',
                'Planning and completing tasks independently',
                'Managing their time',
                'Staying focused on a task',
                'Acting without thinking (impulsivity)',
                'None of the above',
              ],
              followUps: [
                {
                  condition: ['Remembering instructions or information', 'Organising their belongings, homework or school bag', 'Planning and completing tasks independently', 'Managing their time', 'Staying focused on a task', 'Acting without thinking (impulsivity)'],
                  questions: [
                    {
                      id: '6.PM.1a',
                      text: 'Please give any further details or examples',
                      type: 'free_text',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: '6.LC',
          title: 'Language and Communication',
          questions: [
            {
              id: '6.LC.1',
              text: 'Does your child currently have difficulty with any of the following?',
              type: 'multi_choice',
              options: [
                'Pronouncing words clearly',
                'Understanding questions or instructions',
                'Understanding and using a wide range of vocabulary',
                'Understanding jokes, sarcasm or non-literal language',
                'Expressing their ideas clearly when speaking',
                'Finding the right word when talking (word-finding)',
                'None of the above',
              ],
              followUps: [
                {
                  condition: ['Pronouncing words clearly', 'Understanding questions or instructions', 'Understanding and using a wide range of vocabulary', 'Understanding jokes, sarcasm or non-literal language', 'Expressing their ideas clearly when speaking', 'Finding the right word when talking (word-finding)'],
                  questions: [
                    {
                      id: '6.LC.1a',
                      text: 'Please give any further details or examples',
                      type: 'free_text',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: '6.SA',
          title: 'Strengths and Achievements',
          questions: [
            {
              id: '6.SA.1',
              text: 'What does your child enjoy or feel they are good at (at school or outside school)?',
              type: 'free_text',
            },
            {
              id: '6.SA.2',
              text: 'Is there anything else you would like to share about your child\'s strengths or achievements?',
              type: 'free_text',
            },
          ],
        },
        {
          id: '6.CV',
          title: 'Your Child\'s Own Views',
          questions: [
            {
              id: '6.CV.1',
              text: 'What does your child say about school and learning? Are there things they find easy or difficult?',
              type: 'free_text',
            },
            {
              id: '6.CV.2',
              text: 'Is there anything your child has said about how they learn that you think would be helpful for us to know?',
              type: 'free_text',
            },
          ],
        },
        {
          id: '6.PS',
          title: 'Previous Screening Tools',
          questions: [
            {
              id: '6.PS.1',
              text: 'Before this assessment, has your child completed any screening questionnaires, checklists or rating scales related to learning difficulties?',
              type: 'yes_no',
              followUps: [
                {
                  condition: 'yes',
                  questions: [
                    {
                      id: '6.PS.1a',
                      text: 'What was the screening tool?',
                      type: 'free_text',
                    },
                    {
                      id: '6.PS.1b',
                      text: 'Who administered it?',
                      type: 'free_text',
                    },
                    {
                      id: '6.PS.1c',
                      text: 'What was the outcome?',
                      type: 'free_text',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: '7',
      title: 'Any Other Information',
      reportSectionId: 'bg-further',
      questions: [
        {
          id: '7.1',
          text: 'Is there anything else you would like to share that you think may be relevant to this assessment?',
          type: 'free_text',
        },
      ],
    },
    {
      id: '8',
      title: 'Consent',
      questions: [
        {
          id: '8.1',
          text: 'I confirm that the information I have provided is accurate to the best of my knowledge, and I give permission for it to be used as part of the assessment process.',
          type: 'single_choice',
          options: ['I agree'],
        },
      ],
    },
  ],
}

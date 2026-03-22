"""
Examify AI Question Generator
Handles all interactions with the OpenAI API to generate exam questions.
"""

import os
import json
import logging
import re
from typing import List, Dict, Any
from openai import OpenAI

logger = logging.getLogger(__name__)


def get_openai_client():
    """Initialize OpenAI client with API key from environment."""
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY environment variable not set")
    return OpenAI(api_key=api_key)


MCQ_SYSTEM_PROMPT = """You are a strict university examiner creating high-quality exam questions.
Your questions must:
- Test deep understanding, NOT surface memorization
- Be unambiguous with exactly ONE correct answer
- Have plausible but clearly wrong distractors
- Cover different cognitive levels (analysis, application, evaluation)
- Be appropriately difficult (aim for 50% hard, 30% medium, 20% easy)

You MUST respond with ONLY valid JSON. No preamble, no explanation, no markdown fences."""

MCQ_USER_PROMPT = """Generate exactly {mcq_count} multiple choice questions from the content below.

Rules:
- Each MCQ has exactly 4 options labeled A, B, C, D
- One option is clearly correct
- Tag each with a topic (extract from content) and difficulty: Easy/Medium/Hard
- Aim for at least 50% Hard, 30% Medium, 20% Easy
- Avoid trivial or obvious questions
- No duplicate questions

Return ONLY a JSON array with this exact structure:
[
  {{
    "question_text": "Question here?",
    "question_type": "mcq",
    "option_a": "...",
    "option_b": "...",
    "option_c": "...",
    "option_d": "...",
    "correct_answer": "A",
    "topic": "Topic name",
    "difficulty": "Hard",
    "explanation": "Why this is correct..."
  }}
]

CONTENT:
{content}"""

FITB_USER_PROMPT = """Generate exactly {fitb_count} fill-in-the-blank questions from the content below.

Rules:
- Use ___ (three underscores) to mark the blank
- The blank should replace a KEY technical term, concept, or important value
- Include the correct answer (exact word or short phrase)
- Tag each with a topic and difficulty: Easy/Medium/Hard
- Aim for at least 50% Hard, 30% Medium
- Questions should test important concepts, not trivial details

Return ONLY a JSON array with this exact structure:
[
  {{
    "question_text": "The ___ is responsible for...",
    "question_type": "fitb",
    "correct_answer": "exact answer",
    "topic": "Topic name",
    "difficulty": "Medium",
    "explanation": "Context explaining the answer..."
  }}
]

CONTENT:
{content}"""


def generate_mcq_for_chunk(client: OpenAI, chunk: str, count: int) -> List[Dict]:
    """Generate MCQ questions for a single text chunk."""
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": MCQ_SYSTEM_PROMPT},
                {"role": "user", "content": MCQ_USER_PROMPT.format(
                    mcq_count=count,
                    content=chunk
                )}
            ],
            temperature=0.8,
            max_tokens=4000,
        )
        
        raw = response.choices[0].message.content.strip()
        # Strip markdown fences if present
        raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
        raw = re.sub(r'\s*```$', '', raw, flags=re.MULTILINE)
        
        questions = json.loads(raw)
        if not isinstance(questions, list):
            raise ValueError("Response is not a list")
        
        # Validate and normalize each question
        valid_questions = []
        for q in questions:
            if validate_mcq(q):
                q['question_type'] = 'mcq'
                valid_questions.append(q)
        
        return valid_questions
    
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error in MCQ generation: {e}")
        return []
    except Exception as e:
        logger.error(f"MCQ generation error: {e}")
        return []


def generate_fitb_for_chunk(client: OpenAI, chunk: str, count: int) -> List[Dict]:
    """Generate fill-in-the-blank questions for a single text chunk."""
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": MCQ_SYSTEM_PROMPT},
                {"role": "user", "content": FITB_USER_PROMPT.format(
                    fitb_count=count,
                    content=chunk
                )}
            ],
            temperature=0.8,
            max_tokens=3000,
        )
        
        raw = response.choices[0].message.content.strip()
        raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
        raw = re.sub(r'\s*```$', '', raw, flags=re.MULTILINE)
        
        questions = json.loads(raw)
        if not isinstance(questions, list):
            raise ValueError("Response is not a list")
        
        valid_questions = []
        for q in questions:
            if validate_fitb(q):
                q['question_type'] = 'fitb'
                valid_questions.append(q)
        
        return valid_questions
    
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error in FITB generation: {e}")
        return []
    except Exception as e:
        logger.error(f"FITB generation error: {e}")
        return []


def validate_mcq(q: Dict) -> bool:
    """Validate an MCQ question has all required fields."""
    required = ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer']
    if not all(key in q for key in required):
        return False
    if q.get('correct_answer', '').upper() not in ('A', 'B', 'C', 'D'):
        return False
    if len(q.get('question_text', '')) < 10:
        return False
    return True


def validate_fitb(q: Dict) -> bool:
    """Validate a FITB question has all required fields."""
    required = ['question_text', 'correct_answer']
    if not all(key in q for key in required):
        return False
    if '___' not in q.get('question_text', ''):
        return False
    if len(q.get('correct_answer', '')) < 1:
        return False
    return True


def deduplicate_questions(questions: List[Dict]) -> List[Dict]:
    """Remove duplicate questions based on text similarity."""
    seen_texts = set()
    unique = []
    
    for q in questions:
        # Normalize text for comparison
        normalized = re.sub(r'\s+', ' ', q['question_text'].lower().strip())
        normalized = re.sub(r'[^\w\s]', '', normalized)
        
        # Check for near-duplicates (first 60 chars)
        key = normalized[:60]
        if key not in seen_texts:
            seen_texts.add(key)
            unique.append(q)
    
    logger.info(f"Deduplicated: {len(questions)} -> {len(unique)} questions")
    return unique


def generate_questions(text: str, target_mcq: int = 70, target_fitb: int = 30) -> List[Dict]:
    """
    Main question generation function.
    Splits text into chunks and generates questions from each,
    then merges and deduplicates results.
    """
    from utils.text_extractor import split_into_chunks
    
    client = get_openai_client()
    chunks = split_into_chunks(text, max_chunk_size=3000)
    num_chunks = len(chunks)
    
    logger.info(f"Generating questions from {num_chunks} chunks")
    logger.info(f"Target: {target_mcq} MCQ + {target_fitb} FITB = {target_mcq + target_fitb} total")
    
    all_mcq = []
    all_fitb = []
    
    # Distribute questions across chunks
    mcq_per_chunk = max(5, (target_mcq * 2) // num_chunks)  # Generate 2x for dedup buffer
    fitb_per_chunk = max(3, (target_fitb * 2) // num_chunks)
    
    for i, chunk in enumerate(chunks):
        logger.info(f"Processing chunk {i+1}/{num_chunks}")
        
        if len(chunk.strip()) < 200:
            logger.info(f"Skipping chunk {i+1} (too short)")
            continue
        
        chunk_mcq = generate_mcq_for_chunk(client, chunk, mcq_per_chunk)
        all_mcq.extend(chunk_mcq)
        
        chunk_fitb = generate_fitb_for_chunk(client, chunk, fitb_per_chunk)
        all_fitb.extend(chunk_fitb)
    
    # Deduplicate
    all_mcq = deduplicate_questions(all_mcq)
    all_fitb = deduplicate_questions(all_fitb)
    
    # Trim to target counts
    all_mcq = all_mcq[:target_mcq]
    all_fitb = all_fitb[:target_fitb]
    
    # If we didn't generate enough, try one more pass on the full text
    if len(all_mcq) < target_mcq * 0.8 or len(all_fitb) < target_fitb * 0.8:
        logger.warning(f"Low question count: {len(all_mcq)} MCQ, {len(all_fitb)} FITB. Running supplemental generation.")
        full_text_chunk = text[:4000]
        extra_mcq_needed = target_mcq - len(all_mcq)
        extra_fitb_needed = target_fitb - len(all_fitb)
        
        if extra_mcq_needed > 0:
            extra_mcq = generate_mcq_for_chunk(client, full_text_chunk, extra_mcq_needed + 10)
            all_mcq.extend(extra_mcq)
            all_mcq = deduplicate_questions(all_mcq)[:target_mcq]
        
        if extra_fitb_needed > 0:
            extra_fitb = generate_fitb_for_chunk(client, full_text_chunk, extra_fitb_needed + 5)
            all_fitb.extend(extra_fitb)
            all_fitb = deduplicate_questions(all_fitb)[:target_fitb]
    
    # Combine and add order index
    all_questions = []
    for i, q in enumerate(all_mcq):
        q['order_index'] = i
        all_questions.append(q)
    
    for i, q in enumerate(all_fitb):
        q['order_index'] = len(all_mcq) + i
        all_questions.append(q)
    
    logger.info(f"Final: {len(all_mcq)} MCQ + {len(all_fitb)} FITB = {len(all_questions)} total")
    return all_questions

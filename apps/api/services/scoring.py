def score_mcq_answer(question: dict, selected_option_id: str) -> dict:
    # question["weightage"] comes from assessment_questions, not the questions table
    correct = next((o for o in question["options"] if o["isCorrect"]), None)
    is_correct = correct is not None and correct["id"] == selected_option_id
    auto_score = 100.0 if is_correct else 0.0
    weighted = auto_score * question["weightage"] / 100
    return {"is_correct": is_correct, "auto_score": auto_score, "weighted_score": weighted}


def score_coding_answer(question: dict, test_results: list) -> dict:
    # question["weightage"] comes from assessment_questions, not the questions table
    if not test_results:
        return {"auto_score": 0.0, "weighted_score": 0.0}
    passed = sum(1 for t in test_results if t["passed"])
    total = len(test_results)
    auto_score = (passed / total) * 100 if total > 0 else 0.0
    weighted = auto_score * question["weightage"] / 100
    return {"auto_score": auto_score, "weighted_score": weighted}


def compute_final_score(answers: list, questions: list) -> float:
    # questions must include weightage from assessment_questions join
    total_weighted = 0.0
    for answer in answers:
        q = next((q for q in questions if q["id"] == answer["question_id"]), None)
        if q and answer.get("weighted_score") is not None:
            total_weighted += answer["weighted_score"]
    return round(total_weighted, 2)

# Evaluation Performance & Confusion Matrix Analysis

This document provides a detailed breakdown of the performance of the **Skill Router** across two evaluation datasets:
- **`data/tasks.json`** (150 tasks)
- **`backend/src/data/special_tasks.json`** (30 tasks)
- **Total Combined Tasks**: 180

---

## 1. What the Evaluation Ran
The evaluation simulates queries sent to the routing engine and compares the **predicted skills** against the **expected skills** (ground truth).

### Routing Pipeline:
1. **Hybrid Retrieval (RAG)**: Uses a combination of dense vector cosine similarity (embedded via OpenRouter) and sparse keyword search (BM25). The top 100 candidate chunks from each retriever are fused using **Reciprocal Rank Fusion (RRF)**.
2. **LLM Decision Layer**: The OpenRouter LLM receives the prompt and the retrieved candidates. It evaluates each candidate and decides which skills to select, outputting selected names and a confidence rating (0.0 to 1.0).
3. **Threshold Filter**: Filters out selections that fall below a confidence threshold (0.45), triggering fallback heuristics.

---

## 2. Task-Level Evaluation (180 Observations)

### A. Task Routing Confusion Matrix (Route vs. Fallback)
This matrix shows how successfully the system decides whether a task requires a specialized skill (**Positive / Routed**) or is a general/unrelated query that should not trigger any skill (**Negative / Fallback to No-Skill**).

|                                      | Predicted Routed (Positive) | Predicted No-Skill (Negative) |
| :-------------------------------------| :---------------------------:| :-----------------------------:|
| **Actual Requires Skill (Positive)** | **152 (True Positive)**     | **3 (False Negative)**        |
| **Actual No-Skill (Negative)**       | **0 (False Positive)**      | **25 (True Negative)**        |

#### Definitions:
- **True Positive (TP = 152)**: The task required a skill, and the router successfully selected at least one skill.
- **True Negative (TN = 25)**: The task was general/unrelated (No-Skill), and the router correctly selected no skills.
- **False Positive (FP = 0)**: The task was a general query, but the router incorrectly selected a skill.
- **False Negative (FN = 3)**: The task required a skill, but the router incorrectly failed to select any skills.

#### Task Routing Metrics:
- **Accuracy**: **98.33%**
- **Precision**: **100.00%**
- **Recall**: **98.06%**
- **F1-Score**: **99.02%**

### B. Task Exact Match Classification Metrics
Exact match accuracy measures whether the predicted set of skills matches the expected set of skills *exactly*.

- **Exact Match (Success)**: **152 tasks (84.44%)**
- **Partial Match (Overlap)**: **25 tasks (13.89%)**
- **Mismatched (Completely Wrong)**: **3 tasks (1.67%)**

---

## 3. Skill-Level Confusion Matrix (9,180 Observations)
Because this is a multi-label classification system, the router makes an independent binary decision (*select* vs. *ignore*) for each of the **51 candidate skills** for every task.

$$\text{Total Observations} = 180 \text{ tasks} \times 51 \text{ skills} = 9,180$$

| | Predicted Selected (Positive) | Predicted Ignored (Negative) |
| :--- | :---: | :---: |
| **Actual Required (Positive)** | **206 (True Positive)** | **24 (False Negative)** |
| **Actual Irrelevant (Negative)** | **13 (False Positive)** | **8937 (True Negative)** |

#### Definitions:
- **True Positive (TP = 206)**: A required skill was correctly selected.
- **True Negative (TN = 8937)**: An irrelevant skill was correctly ignored.
- **False Positive (FP = 13)**: An irrelevant skill was incorrectly selected.
- **False Negative (FN = 24)**: A required skill was incorrectly ignored.

#### Skill-Level Aggregated Metrics:
- **Accuracy (Hamming Accuracy)**: **99.60%**
- **Precision (Micro)**: **94.06%**
- **Recall (Micro)**: **89.57%**
- **F1-Score**: **91.76%**

from __future__ import annotations
import numpy as np
import torch
import json
import os

@torch.no_grad()

def pick_device(prefer: str | None = None) -> torch.device:
  if prefer:
    return torch.device(prefer)
  if torch.cuda.is_available():
    return torch.device("cuda")
  if torch.backends.mps.is_available():
    return torch.device("mps")
  return torch.device("cpu")

def read_input_file(input_file: str, number_type: np.dtype = np.float32):
  with open(input_file, 'r') as f:
    data = json.load(f)
    dictionary = data['dictionary'].split(',')
    symbols = data['symbols'].items()
    dim = len(dictionary)
    count = len(symbols)
    embeddings = np.zeros((count, dim), dtype = number_type) # [v_0; v_1; v_2 ...]

    idx = 0
    keys = []
    for key, value in symbols:
      keys.append(key)
      embedding = np.zeros(dim, dtype = number_type)
      
      arr_str = value.split(',')
      arr_int = [int(x, 36) for x in arr_str]
      arr_len = len(arr_int)
      
      for i, val in enumerate(arr_int):
        embedding[val] = (1 - i / arr_len) * min(max(1 - val / dim + 0.10, 0), 1)
      # embedding = embedding / np.linalg.norm(embedding)
      embeddings[idx, :] = embedding
      idx += 1
    return {"keys": keys, "dictionary": data['dictionary'], "embeddings": embeddings}

def main(number_type: torch.dtype = torch.float32, top_k: int = 16, threshold: float = 0.5, input_file = "./dist/search-index.json", output_dir = "./dist"):
  dev = pick_device()
  data = read_input_file(input_file)
  keys = data["keys"]
  dictionary = data["dictionary"]
  embeddings = data["embeddings"]
  x = torch.as_tensor(embeddings, dtype = number_type, device = dev)
  x = torch.nn.functional.normalize(x, p = 2, dim = 1)
  sim = x @ x.T
  sim.fill_diagonal_(-float('inf'))
  top_sims, top_indices = torch.topk(sim, k = top_k, dim = 1, sorted = True)
  result = {"dictionary": dictionary, "similarity": {}}
  for idx, (sim_items, scores) in enumerate(zip(top_indices, top_sims)):
    matched_ids = sim_items.tolist()
    matched_scores = scores.tolist()
    arr = []
    for i, matched_id in enumerate(matched_ids):
      if matched_scores[i] >= threshold:
        arr.append(keys[matched_id])
    if len(arr) > 0:
      result["similarity"][keys[idx]] = ",".join(arr)

  print(result)

  output_file = os.path.join(output_dir, "similarity.json")
  with open(output_file, 'w') as g:
    json.dump(result, g, ensure_ascii = False, separators = (',', ':'))

main()
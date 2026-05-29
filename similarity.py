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
    return {"keys": keys, "dictionary": dictionary, "embeddings": embeddings}

def key_to_symbol_name(key, dictionary):
  components_str = key.split('_')
  words = [dictionary[int(x, 36)] for x in components_str]
  return "_".join(words)

def to_radix_string(n, radix):
    if n == 0:
        return "0"
    digits = "0123456789abcdefghijklmnopqrstuvwxyz"
    result = ""
    while n > 0:
        result = digits[n % radix] + result
        n //= radix
    return result

def main(number_type: torch.dtype = torch.float32, top_k: int = 32, threshold: float = 0.5, input_file = "./dist/search-index.json", output_dir = "./dist"):
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
  frequency_map = {}
  similarity = {}
  result = {"symbols": [], "similarity": {}}
  for idx, (sim_items, scores) in enumerate(zip(top_indices, top_sims)):
    matched_ids = sim_items.tolist()
    matched_scores = scores.tolist()
    arr = []
    for i, matched_id in enumerate(matched_ids):
      if matched_scores[i] >= threshold and matched_id != idx:
        symbol_name = key_to_symbol_name(keys[matched_id], dictionary)
        if symbol_name not in frequency_map:
          frequency_map[symbol_name] = 0
        frequency_map[symbol_name] += 1
        arr.append(symbol_name)
    
    if len(arr) > 0:
      symbol_name = key_to_symbol_name(keys[idx], dictionary)
      if symbol_name not in frequency_map:
        frequency_map[symbol_name] = 0
      frequency_map[symbol_name] += 1
      similarity[symbol_name] = arr
  symbols = sorted(frequency_map.items(), key = lambda item: item[1], reverse = True)
  symbols = [x[0] for x in symbols]
  for symbol_name in similarity:
    arr = similarity[symbol_name]
    arr = [to_radix_string(symbols.index(x), 36) for x in arr]
    key = to_radix_string(symbols.index(symbol_name), 36)
    result["similarity"][key] = ",".join(arr)
  result["symbols"] = ",".join(symbols)
  output_file = os.path.join(output_dir, "similarity.json")
  with open(output_file, 'w') as g:
    json.dump(result, g, ensure_ascii = False, separators = (',', ':'))

main()

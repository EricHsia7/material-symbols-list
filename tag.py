import clip, torch
from PIL import Image
import json
import time
import os
import re

def get_class_descriptions():
  result = set()
  with open("./tmp/versions.json", "r", encoding="utf-8") as file:
    data = json.load(file)
    for symbol_name in data:
      # full phrase -> exact semantic meaning
      phrase = symbol_name.replace("_", " ")
      result.add(phrase)
      # split words -> broad tag matching
      words = symbol_name.split("_")
      for word in words:
        if len(word) > 1 and re.fullmatch(r'^[+-]?(\d+\.\d*|\.\d+|\d+)([Ee][+-]?\d+)?$', word) is None:
          result.add(word)
  return list(result)

device = "cpu"
model, preprocess = clip.load("ViT-B/16", device=device)

class_descriptions = get_class_descriptions()

# Prompt ensembling: Providing context helps CLIP understand it's looking at graphical symbols
templates = [
    "a black and white icon of [{}]",
    "a material design symbol representing [{}]",
    "a minimalist illustration of [{}]"
]

def get_text_features(descriptions, cache_path="./text_features.pt"):
    if os.path.exists(cache_path):
        print(f"Loading cached text features from {cache_path}...")
        cached_data = torch.load(cache_path) 
        old_descriptions = cached_data['descriptions']
        old_features = cached_data['features'].to(device)
        
        # Create a lookup dictionary mapping string -> 1D feature tensor
        # slice [i:i+1] to keep the batch dimension (1, dim)
        old_desc_to_feature = {
            desc: old_features[i:i+1] 
            for i, desc in enumerate(old_descriptions)
        }
    else:
        old_desc_to_feature = {}

    features_list = []
    descriptions_to_compute = []
    indices_to_compute = []

    # Check which descriptions are cached and which are new
    for i, desc in enumerate(descriptions):
        if desc in old_desc_to_feature:
            features_list.append(old_desc_to_feature[desc])
        else:
            # Add a placeholder
            features_list.append(None)
            descriptions_to_compute.append(desc)
            indices_to_compute.append(i)

    # Compute the newly added descriptions
    if descriptions_to_compute:
        print(f"Computing features for {len(descriptions_to_compute)} new descriptions...")
        with torch.no_grad():
            computed_features = []
            for desc in descriptions_to_compute:
                texts = [template.format(desc) for template in templates]
                text_inputs = torch.cat([clip.tokenize(t) for t in texts]).to(device)
                features = model.encode_text(text_inputs)
                
                features = features.mean(dim=0, keepdim=True)
                features = features / features.norm(dim=-1, keepdim=True)
                computed_features.append(features)
            
            # Fill in the placeholders with newly computed features
            for idx, feat in zip(indices_to_compute, computed_features):
                features_list[idx] = feat
    else:
        print("All features were already cached!")

    features_tensor = torch.cat(features_list)

    # Update the cache if anything changed
    if not os.path.exists(cache_path) or descriptions != cached_data.get('descriptions', []):
        print(f"Updating cache at {cache_path}...")
        torch.save({
            'descriptions': descriptions,
            'features': features_tensor.cpu()
        }, cache_path)

    return features_tensor

text_features = get_text_features(class_descriptions)

def tag_image(file_path):
  start = time.time()
  image_tensor = preprocess(Image.open(file_path)).unsqueeze(0).to(device)
  with torch.no_grad():
    image_features = model.encode_image(image_tensor)
    image_features = image_features / image_features.norm(dim=-1, keepdim=True)

    similarities = (100.0 * image_features @ text_features.T).softmax(dim=-1)
    values, indices = similarities[0].topk(16)

    result = [class_descriptions[idx] for idx in indices]

    end = time.time()
    print(f"Successfully tagged {file_path} in {end - start:.2f}s")
    return result

def main(input_dir="./tmp/rasterized", output_dir="./tags"):
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # Iterate through all PNG files
    for filename in os.listdir(input_dir):
        if filename.lower().endswith(".png"):
            file_path = os.path.join(input_dir, filename)

            # Process image
            result_list = tag_image(file_path)

            # Construct output filename
            base_name = os.path.splitext(filename)[0]
            output_file = os.path.join(output_dir, f"{base_name}.txt")

            # Save results to file
            with open(output_file, "w", encoding="utf-8") as f:
                for item in result_list:
                    f.write(str(item) + "\n")

main()
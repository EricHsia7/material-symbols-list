import clip, torch
from PIL import Image
import json
import time
import os
import re

def get_class_descriptions(baseDictionary="./tmp/dictionary.txt", synonymies="./synonymies"):
  result = set()
  with open(baseDictionary, "r", encoding="utf-8") as file1:
    content1 = file1.read()
    items1 = content1.splitlines()
    for item1 in items1:
      result.add(item1)
  for filename in os.listdir(synonymies):
    if filename.lower().endswith(".txt"):
      file_path = os.path.join(synonymies, filename)
      with open(baseDictionary, "r", encoding="utf-8") as file2:
        content2 = file2.read()
        items2 = content2.splitlines()
        for item2 in items2:
          items3 = re.split(r'[;,\s]+', item2)
          for item3 in items3:
            result.add(item3)
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

def encode_with_templates(descriptions):
  print("Encoding text features with prompt ensembling...")
  with torch.no_grad():
    all_features = []
    for desc in descriptions:
      # Create multiple prompt variations for a single word/phrase
      texts = [template.format(desc) for template in templates]
      text_inputs = torch.cat([clip.tokenize(t) for t in texts]).to(device)
      features = model.encode_text(text_inputs)
      
      # Average the features across the templates to get a robust vector
      features = features.mean(dim=0, keepdim=True)
      features = features / features.norm(dim=-1, keepdim=True)
      all_features.append(features)
  return torch.cat(all_features)

text_features = encode_with_templates(class_descriptions)

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

def main(input_dir="./tmp/rasterized", output_dir="./tags", prompts_dir="./tmp/prompts"):
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(prompts_dir, exist_ok=True)

    # Iterate through all PNG files
    for filename in os.listdir(input_dir):
        if filename.lower().endswith(".png"):
            file_path = os.path.join(input_dir, filename)

            # Process image
            result_list = tag_image(file_path)

            # Construct output filename
            base_name = os.path.splitext(filename)[0]
            output_file = os.path.join(output_dir, f"{base_name}.txt")
            prompt_file = os.path.join(prompts_dir, f"{base_name}.txt")

            # Save results to file
            with open(output_file, "w", encoding="utf-8") as f:
                for item in result_list:
                    f.write(str(item) + "\n")

main()
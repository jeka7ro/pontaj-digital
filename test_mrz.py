import re

mrz = "RK192171<2ROU8011026M281102814301267"
mrz2 = "RK1921712ROU8011026M281102814301267" # without <

pattern = r'ROU(\d{6})\d[MF<](\d{6})\d([12568]\d{6})'

for text in [mrz, mrz2]:
    match = re.search(pattern, text)
    if match:
        dob = match.group(1)
        expiry = match.group(2)
        opt_data = match.group(3)
        cnp = opt_data[0] + dob + opt_data[1:]
        print(f"Matched: DOB={dob}, Opt={opt_data} -> CNP={cnp}")
    else:
        print("No match")

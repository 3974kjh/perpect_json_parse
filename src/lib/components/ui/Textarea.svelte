<script lang="ts">
interface Props {
  value?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  readonly?: boolean;
  error?: boolean;
  class?: string;
  oninput?: (event: Event) => void;
  onchange?: (event: Event) => void;
  onfocus?: (event: Event) => void;
  onblur?: (event: Event) => void;
}

let {
  value = '',
  placeholder = '',
  rows = 4,
  disabled = false,
  readonly = false,
  error = false,
  class: className = '',
  oninput,
  onchange,
  onfocus,
  onblur
}: Props = $props();

const baseClasses = 'block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm resize-none';

const stateClasses = error 
  ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
  : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500';

const disabledClasses = disabled 
  ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
  : 'bg-white';

const classes = `${baseClasses} ${stateClasses} ${disabledClasses} ${className}`;
</script>

<textarea
  bind:value
  class={classes}
  {placeholder}
  {rows}
  {disabled}
  {readonly}
  {oninput}
  {onchange}
  {onfocus}
  {onblur}
></textarea> 